import * as Three from "three";
import { type Component, type EntityID, System, type World } from "../ecs.ts";
import { assert } from "../asserts.ts";
import {
	ActiveCameraComponent,
	RendererComponent,
	SceneComponent,
	threeObjectTag,
	Transform,
	Viewport,
} from "./components.ts";
import { Instrumentor } from "../lib.ts";
import { warnOnce } from "../logging.ts";
import type { WebGLRenderer } from "three";

//  ██████╗ ██████╗      ██╗███████╗██╗   ██╗███████╗
// ██╔═══██╗██╔══██╗     ██║██╔════╝╚██╗ ██╔╝██╔════╝
// ██║   ██║██████╔╝     ██║███████╗ ╚████╔╝ ███████╗
// ██║   ██║██╔══██╗██   ██║╚════██║  ╚██╔╝  ╚════██║
// ╚██████╔╝██████╔╝╚█████╔╝███████║   ██║   ███████║
//  ╚═════╝ ╚═════╝  ╚════╝ ╚══════╝   ╚═╝   ╚══════╝

/**
 * This system syncs the ECS world with a {@link Three.Scene}.
 * Any components tagged with {@link ThreeObjectTag} are synced with the scene,
 * and their transforms are synced with their entity's {@link Transform} component.
 * This should run after other systems modify Three.js components and transforms,
 * and before any render systems.
 *
 * Requires a {@link SceneComponent } to be present in the world on startup.
 */
export class ThreeObjectSystem extends System {
	get scene() {
		let scene = this.world.resolveComponent(SceneComponent)?.value;
		assert(!!scene, "ThreeObjectSystem requires a ThreeScene singleton");
		return scene;
	}

	override startup() {
		this.scene.userData.elysiaEcsWorld = this.world;
		// get all three objects in scene
		for (const [entity, threeObject] of this.world.entitiesWithTag(
			threeObjectTag,
		)) {
			if (
				(<any>threeObject).transformless ||
				this.world.hasComponent(entity, Transform)
			) {
				let o3d: Three.Object3D =
					threeObject instanceof Three.Object3D
						? threeObject
						: (<any>threeObject).object3d;
				o3d.matrixWorldAutoUpdate = false;
				this.scene.add(o3d);
			}
		}

		this.whenShutdown(
			this.world.onComponentWithTagAdded(threeObjectTag, this.addThreeObject),
			this.world.onComponentWithTagRemoved(
				threeObjectTag,
				this.removeThreeObject,
			),
			this.world.onComponentAdded(Transform, this.transformAdded),
			this.world.onComponentRemoved(Transform, this.transformRemoved),
		);
	}

	override update(delta: number) {
		Instrumentor.start("ThreeObjectSystem::update");
		for (let [entity, transformComponent] of this.world.entitiesWith(
			Transform,
		)) {
			// update world matrix
			const matrix = Transform.calculateWorldMatrix(this.world, entity);
			for (const o3d of this.world.componentsWithTag(entity, threeObjectTag)) {
				if (o3d instanceof Three.Object3D) {
					// update both worldTransform and decomposed transforms to ensure
					// any external systems reading position/rotation/scale get the updated values
					o3d.matrixWorld.copy(matrix);
					o3d.matrixWorld.decompose(o3d.position, o3d.quaternion, o3d.scale);
				}
			}
			// todo: update bounding box / sphere components if present
		}
		Instrumentor.end("ThreeObjectSystem::update");
	}

	protected addThreeObject = (
		world: World,
		entity: EntityID,
		threeObject: Component,
	) => {
		if (
			(<any>threeObject).transformless ||
			world.hasComponent(entity, Transform)
		) {
			let o3d: Three.Object3D =
				threeObject instanceof Three.Object3D
					? threeObject
					: (<any>threeObject).object3d;
			o3d.matrixWorldAutoUpdate = false;
			this.scene.add(o3d);
		}
	};

	protected removeThreeObject = (
		world: World,
		entity: EntityID,
		threeObject: Component,
	) => {
		let o3d: Three.Object3D =
			threeObject instanceof Three.Object3D
				? threeObject
				: (<any>threeObject).object3d;
		this.scene.remove(o3d);
	};

	protected transformAdded = (
		world: World,
		entity: EntityID,
		transform: Transform,
	) => {
		for (const threeObject of world.componentsWithTag(entity, threeObjectTag)) {
			let o3d: Three.Object3D =
				threeObject instanceof Three.Object3D
					? threeObject
					: (<any>threeObject).object3d;
			this.scene.add(o3d);
		}
	};

	protected transformRemoved = (
		world: World,
		entity: EntityID,
		component: Transform,
	) => {
		for (const threeObject of world.componentsWithTag(entity, threeObjectTag)) {
			let o3d: Three.Object3D =
				threeObject instanceof Three.Object3D
					? threeObject
					: (<any>threeObject).object3d;
			this.scene.remove(o3d);
		}
	};
}

// ██████╗ ███████╗███╗   ██╗██████╗ ███████╗██████╗ ███████╗██████╗
// ██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔════╝██╔══██╗██╔════╝██╔══██╗
// ██████╔╝█████╗  ██╔██╗ ██║██║  ██║█████╗  ██████╔╝█████╗  ██████╔╝
// ██╔══██╗██╔══╝  ██║╚██╗██║██║  ██║██╔══╝  ██╔══██╗██╔══╝  ██╔══██╗
// ██║  ██║███████╗██║ ╚████║██████╔╝███████╗██║  ██║███████╗██║  ██║
// ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝

export class ThreeRenderSystem extends System {
	/**
	 * Automatically update the active camera's projection matrix
	 * @default true
	 */
	public autoUpdateCamera = true;

	constructor(private rendererArgs?: any) {
		super();
	}

	override update(delta: number) {
		Instrumentor.start("ThreeBasicRenderSystem::update");

		Instrumentor.start("ThreeBasicRenderSystem::update::resolveComponents");
		let scene = this.world.resolveComponent(SceneComponent)?.value;
		if (!scene)
			return warnOnce(
				"ThreeBasicRenderSystem: Requires a SceneComponent. Skipping update.",
			);

		let renderer = this.world.resolveComponent(RendererComponent)?.value;
		if (!renderer)
			return warnOnce(
				"ThreeBasicRenderSystem: Requires a RendererComponent. Skipping update.",
			);

		let viewport = this.world.resolveComponent(Viewport);
		if (!viewport) {
			return warnOnce(
				"ThreeBasicRenderSystem: Requires a Viewport component. Skipping update.",
			);
		}

		let cameraEntity: EntityID | undefined;
		let activeCamera: ActiveCameraComponent | undefined;
		for (let [entity, activeCam] of this.world.entitiesWith(
			ActiveCameraComponent,
		)) {
			cameraEntity = entity;
			activeCamera = activeCam;
			break;
		}

		if (!activeCamera)
			return warnOnce(
				"ThreeBasicRenderSystem: Requires an ActiveCamera singleton attached to an entity with a sibling Camera component. Skipping update.",
			);

		let camera =
			this.world.getComponent(cameraEntity!, Three.PerspectiveCamera) ??
			this.world.getComponent(cameraEntity!, Three.OrthographicCamera);
		if (!camera)
			return warnOnce(
				"ThreeBasicRenderSystem: The entity with the ActiveCameraComponent must also have a Camera component. Skipping update.",
			);

		Instrumentor.end("ThreeBasicRenderSystem::update::resolveComponents");

		// update the camera's projection matrix
		if (this.autoUpdateCamera) {
			Instrumentor.start("ThreeBasicRenderSystem::update::updateCameraMatrix");
			if (camera instanceof Three.PerspectiveCamera) {
				camera.aspect = viewport.ratio;
				camera.updateProjectionMatrix();
			} else if (camera instanceof Three.OrthographicCamera) {
				camera.left = -1 * viewport.ratio;
				camera.right = viewport.ratio;
				camera.top = 1;
				camera.bottom = -1;
				camera.updateProjectionMatrix();
			}
			Instrumentor.end("ThreeBasicRenderSystem::update::updateCameraMatrix");
		}

		// update renderer dimensions
		Instrumentor.start("ThreeBasicRenderSystem::update::resize");
		if (
			this.cachedHeight !== viewport.height ||
			this.cachedWidth !== viewport.width
		) {
			this.cachedHeight = viewport.height;
			this.cachedWidth = viewport.width;
			this.resize(viewport);
		}
		Instrumentor.end("ThreeBasicRenderSystem::update::resize");

		Instrumentor.start("ThreeBasicRenderSystem::update::render");
		this.render(delta, scene, camera, renderer, viewport);
		Instrumentor.end("ThreeBasicRenderSystem::update::render");

		Instrumentor.end("ThreeBasicRenderSystem::update");
	}

	/**
	 * Method for rendering the scene with the given camera.
	 * Can be extended for custom rendering logic.
	 * @param delta number
	 * @param scene {@link Three.Scene}
	 * @param camera {@link Three.Camera}
	 * @param viewport {@link Viewport}
	 */
	render(
		delta: number,
		scene: Three.Scene,
		camera: Three.Camera,
		renderer: WebGLRenderer | Three.WebGPURenderer,
		viewport: Viewport,
	) {
		Instrumentor.start("ThreeBasicRenderSystem::render");
		renderer.render(scene, camera);
		Instrumentor.end("ThreeBasicRenderSystem::render");
	}

	/**
	 * Method for when the viewport dimensions change.
	 * Can be extended for custom resize logic.
	 * @param viewport {@link Viewport}
	 */
	resize(viewport: Viewport) {
		let renderer = this.world.resolveComponent(RendererComponent)?.value;
		if (!renderer)
			warnOnce(
				"ThreeBasicRenderSystem: No renderer found on SceneDataComponent. Cannot resize.",
			);
		else {
			renderer.setSize(viewport.width, viewport.height, false);
			renderer.setPixelRatio(viewport.pixelRatio);
		}
	}

	protected cachedWidth = 0;
	protected cachedHeight = 0;
}
