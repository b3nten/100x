import { type Component, type EntityID, World, System } from "./ecs.ts";
import {
	Matrix4,
	Object3D,
	Quaternion,
	Vector3,
	Vector2,
	Euler,
	WebGLRenderer,
} from "three";
import { Relationship } from "./ecs.ts";
import * as Three from "three";
import {
	Input,
	KeyCode,
	KeyDownEvent,
	KeyUpEvent,
	MouseCode,
	MouseMoveEvent,
} from "./input.ts";
import { isNumber } from "./checks.ts";
import { clamp } from "./math.ts";
import type { EventData } from "./events.ts";
import { assert } from "./asserts.ts";
import { Instrumentor } from "./lib.ts";
import { warnOnce } from "./logging.ts";

//  ██████╗ ██████╗ ███╗   ███╗██████╗  ██████╗ ███╗   ██╗███████╗███╗   ██╗████████╗███████╗
// ██╔════╝██╔═══██╗████╗ ████║██╔══██╗██╔═══██╗████╗  ██║██╔════╝████╗  ██║╚══██╔══╝██╔════╝
// ██║     ██║   ██║██╔████╔██║██████╔╝██║   ██║██╔██╗ ██║█████╗  ██╔██╗ ██║   ██║   ███████╗
// ██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║   ██║██║╚██╗██║██╔══╝  ██║╚██╗██║   ██║   ╚════██║
// ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ╚██████╔╝██║ ╚████║███████╗██║ ╚████║   ██║   ███████║
//  ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝

export const threeObjectTag = Symbol("ThreeObject");
// @ts-expect-error
Object3D.ecsTags = [threeObjectTag];

// ████████╗██████╗  █████╗ ███╗   ██╗███████╗███████╗ ██████╗ ██████╗ ███╗   ███╗
// ╚══██╔══╝██╔══██╗██╔══██╗████╗  ██║██╔════╝██╔════╝██╔═══██╗██╔══██╗████╗ ████║
//    ██║   ██████╔╝███████║██╔██╗ ██║███████╗█████╗  ██║   ██║██████╔╝██╔████╔██║
//    ██║   ██╔══██╗██╔══██║██║╚██╗██║╚════██║██╔══╝  ██║   ██║██╔══██╗██║╚██╔╝██║
//    ██║   ██║  ██║██║  ██║██║ ╚████║███████║██║     ╚██████╔╝██║  ██║██║ ╚═╝ ██║
//    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚═╝      ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝

export class Transform implements Component {
	static xAxis = new Vector3(1, 0, 0);
	static yAxis = new Vector3(0, 1, 0);
	static zAxis = new Vector3(0, 0, 1);

	private static matrixAcc: Array<Transform> = [];
	private static parentWorld = new Matrix4();
	private static vec3 = new Vector3();
	private static quat = new Quaternion();

	/**
	 * Calculate the world transform from local, adjusted for parents.
	 * @param world - the World of the containing Entity
	 * @param transform - the Transform component of the Entity
	 * @param input - Optional Matrix4 input paramater to be set
	 * @returns Matrix4 containing world transform of Entity
	 */
	static calculateWorldMatrix(
		world: World,
		entity: EntityID,
		input?: Matrix4,
	): Matrix4 {
		if (!input) {
			input = new Matrix4();
		}

		const baseTransform = world.getComponent(entity, Transform);
		const baseRelationship = world.getComponent(entity, Relationship);

		// return identity if no transform or relationship
		if (!baseTransform && !baseRelationship) {
			return input.identity();
		}

		// no parent, local is world
		if (baseTransform && !baseRelationship) {
			input.copy(baseTransform.calculateMatrix());
		}

		// base transform exists, start with that
		if (baseTransform) {
			input.copy(baseTransform.calculateMatrix());
		} else {
			// no base transform, start with identity
			input.identity();
		}

		// parent
		Transform.matrixAcc.length = 0;
		if (baseRelationship) {
			let currentParent = baseRelationship.parent;
			while (currentParent) {
				const parentTransform = world.getComponent(currentParent, Transform);
				if (parentTransform) {
					Transform.matrixAcc.push(parentTransform);
				}
				const parentRel = world.getComponent(currentParent, Relationship);
				if (parentRel) {
					currentParent = parentRel.parent;
				} else {
					currentParent = null;
				}
			}
			if (Transform.matrixAcc.length === 0) {
				return input;
			}
			if (Transform.matrixAcc.length === 1) {
				return input.multiply(Transform.matrixAcc[0].calculateMatrix());
			}
			// @ts-ignore
			Transform.parentWorld.copy(Transform.matrixAcc.at(-1)?.calculateMatrix());
			for (let i = Transform.matrixAcc.length - 2; i >= 0; i--) {
				Transform.parentWorld.multiply(
					Transform.matrixAcc[i].calculateMatrix(),
				);
			}
			return input.multiply(Transform.parentWorld);
		}
		return input;
	}

	static createWithPosition(x: number, y: number, z: number) {
		const t = new Transform();
		t.position.set(x, y, z);
		return t;
	}

	static createWithRotation(x: number, y: number, z: number, w: number) {
		const t = new Transform();
		t.rotation.set(x, y, z, w);
		return t;
	}

	static createWithScale(x: number, y: number, z: number) {
		const t = new Transform();
		t.scale.set(x, y, z);
		return t;
	}

	/** Position in local space */
	public readonly position = new Vector3();
	/** Rotation in local space */
	public readonly rotation = new Quaternion();
	/** Scale in local space */
	public readonly scale = new Vector3(1, 1, 1);
	/**
	 * The local matrix of this transform.
	 *
	 * This matrix is not automatically updated when pos/rot/scale is changed.
	 * Use {@link calculateMatrix}.
	 */
	public readonly matrix = new Matrix4();

	public readonly worldMatrix = new Matrix4();

	/** Calculate the local matrix of this transform */
	protected calculateMatrix(): Matrix4 {
		return this.matrix.compose(this.position, this.rotation, this.scale);
	}

	/**
	 * Translate the transform on a given axis.
	 * @param axis The normalied axis to translate on.
	 * @param amount The amount to translate.
	 */
	translateOnAxis(axis: Vector3, amount: number): void {
		Transform.vec3.copy(axis);
		Transform.quat.copy(this.rotation);
		Transform.quat.normalize();
		Transform.vec3.applyQuaternion(Transform.quat);
		Transform.vec3.multiplyScalar(amount);
		this.position.add(Transform.vec3);
	}

	translateX(amount: number): void {
		this.translateOnAxis(Transform.xAxis, amount);
	}

	translateY(amount: number): void {
		this.translateOnAxis(Transform.yAxis, amount);
	}

	translateZ(amount: number): void {
		this.translateOnAxis(Transform.zAxis, amount);
	}

	setPosition(x: number, y: number, z: number): this {
		this.position.set(x, y, z);
		return this;
	}

	setPositionScalar(s: number): this {
		this.position.set(s, s, s);
		return this;
	}

	setRotation(x: number, y: number, z: number, w: number): this {
		this.rotation.set(x, y, z, w);
		return this;
	}

	setScale(x: number, y: number, z: number): this {
		this.scale.set(x, y, z);
		return this;
	}

	setScaleScalar(s: number): this {
		this.scale.set(s, s, s);
		return this;
	}

	clone(): Transform {
		const t = new Transform();
		this.copy(t);
		return t;
	}

	copy(source: Transform): Transform {
		this.position.copy(source.position);
		this.rotation.copy(source.rotation);
		this.scale.copy(source.scale);
		this.matrix.copy(source.matrix);
		this.worldMatrix.copy(source.worldMatrix);
		return this;
	}
}

/**
 * Convention for flagging an entity with a sibling Camera component as the active camera.
 */
export class ActiveCameraComponent implements Component {}

export class SceneComponent implements Component {
	constructor(public value: Three.Scene) {}
}

export class RendererComponent implements Component {
	constructor(public value: WebGLRenderer) {}
}

export class BoundingBoxComponent implements Component {
	constructor(public box: Three.Box3) {}
}

export class BoundingSphereComponent implements Component {
	constructor(public sphere: Three.Sphere) {}
}

// ██╗   ██╗██╗███████╗██╗    ██╗██████╗  ██████╗ ██████╗ ████████╗
// ██║   ██║██║██╔════╝██║    ██║██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝
// ██║   ██║██║█████╗  ██║ █╗ ██║██████╔╝██║   ██║██████╔╝   ██║
// ╚██╗ ██╔╝██║██╔══╝  ██║███╗██║██╔═══╝ ██║   ██║██╔══██╗   ██║
//  ╚████╔╝ ██║███████╗╚███╔███╔╝██║     ╚██████╔╝██║  ██║   ██║
//   ╚═══╝  ╚═╝╚══════╝ ╚══╝╚══╝ ╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝

export class Viewport implements Component {
	/** Viewport width in pixels */
	width: number;
	/** Viewport height in pixels */
	height: number;
	/** Pixel ratio, usually {@link devicePixelRatio} */
	pixelRatio: number;
	/** Canvas to output to, either en Element or an OffscreenCanvas */
	canvas: HTMLCanvasElement | OffscreenCanvas;
	/** Ratio of width / height */
	get ratio() {
		return this.width / this.height;
	}

	constructor(args: {
		width: number;
		height: number;
		devicePixelRatio: number;
		canvas: HTMLCanvasElement | OffscreenCanvas;
	}) {
		this.width = args.width;
		this.height = args.height;
		this.pixelRatio = args.devicePixelRatio;
		this.canvas = args.canvas;
	}

	/**
	 * Create a fullscreen Viewport component that automatically resizes with the window.
	 * @param canvas
	 */
	static fullScreenCanvas(canvas: HTMLCanvasElement) {
		const viewport = new Viewport({
			width: window.innerWidth,
			height: window.innerHeight,
			devicePixelRatio: devicePixelRatio,
			canvas,
		});
		const weakref = new WeakRef(viewport);
		let handler = () => {
			let v = weakref.deref();
			if (v) {
				v.width = window.innerWidth;
				v.height = window.innerHeight;
			} else {
				window.removeEventListener("resize", handler);
			}
		};
		window.addEventListener("resize", handler);
		return viewport;
	}
}

//  ██████╗ ██████╗ ██╗██████╗
// ██╔════╝ ██╔══██╗██║██╔══██╗
// ██║  ███╗██████╔╝██║██║  ██║
// ██║   ██║██╔══██╗██║██║  ██║
// ╚██████╔╝██║  ██║██║██████╔╝
//  ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝

export class InfiniteGridHelper extends Three.Mesh implements Component {
	constructor(
		size1 = 1,
		size2 = 10,
		color: Three.Color = new Three.Color("#e5e5e5"),
		distance = 4000,
		axes = "xzy",
	) {
		const planeAxes = axes.substring(0, 2);
		const geometry = new Three.PlaneGeometry(2, 2, 1, 1);
		const material = new Three.ShaderMaterial({
			side: Three.DoubleSide,
			uniforms: {
				uSize1: {
					value: size1,
				},
				uSize2: {
					value: size2,
				},
				uColor: {
					value: color,
				},
				uDistance: {
					value: distance,
				},
			},
			transparent: true,
			vertexShader: `
           		varying vec3 worldPosition;
		   		uniform float uDistance;

		   		void main() {
                    vec3 pos = position.${axes} * uDistance;
                    pos.${planeAxes} += cameraPosition.${planeAxes};
                    worldPosition = pos;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
           `,
			fragmentShader: `
                varying vec3 worldPosition;
                uniform float uSize1;
                uniform float uSize2;
                uniform vec3 uColor;
                uniform float uDistance;

                float getGrid(float size) {
                    vec2 r = worldPosition.${planeAxes} / size;
                    vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
                    float line = min(grid.x, grid.y);
                    return 1.0 - min(line, 1.0);
                }

                void main() {
                    float d = 1.0 - min(distance(cameraPosition.${planeAxes}, worldPosition.${planeAxes}) / uDistance, 1.0);

                    float g1 = getGrid(uSize1);
                    float g2 = getGrid(uSize2);

                    gl_FragColor = vec4(uColor.rgb, mix(g2, g1, g1) * pow(d, 3.0));
                    gl_FragColor.a = mix(0.5 * gl_FragColor.a, gl_FragColor.a, g2);

                    if ( gl_FragColor.a <= 0.0 ) discard;
                }
           `,
		});
		// const nodeMaterial = new Three.NodeMaterial({});
		super(geometry, material);
		this.frustumCulled = false;
	}
}

// ███████╗██████╗ ███████╗███████╗██╗      ██████╗  ██████╗ ██╗  ██╗
// ██╔════╝██╔══██╗██╔════╝██╔════╝██║     ██╔═══██╗██╔═══██╗██║ ██╔╝
// █████╗  ██████╔╝█████╗  █████╗  ██║     ██║   ██║██║   ██║█████╔╝
// ██╔══╝  ██╔══██╗██╔══╝  ██╔══╝  ██║     ██║   ██║██║   ██║██╔═██╗
// ██║     ██║  ██║███████╗███████╗███████╗╚██████╔╝╚██████╔╝██║  ██╗
// ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝

export class FreeLookComponent implements Component {
	velocity = new Vector3();
	euler = new Euler(0, 0, 0, "YXZ");
}

export const FORWARD = 1 << 0;
export const LEFT = 1 << 1;
export const RIGHT = 1 << 2;
export const BACK = 1 << 3;
export const UP = 1 << 4;
export const DOWN = 1 << 5;
export const SPRINT = 1 << 6;

export class FreeLookControlSystem extends System {
	static Actions = {
		Forward: "FORWARD",
		Back: "BACK",
		Left: "LEFT",
		Right: "RIGHT",
		Up: "UP",
		Down: "DOWN",
		Sprint: "SPRINT",
	};

	static Defaults = {
		MoveSpeed: 15,
		Friction: 0.9,
		LookSpeed: 0.5,
		SprintMult: 5,
		Keymap: {
			[KeyCode.W]: FreeLookControlSystem.Actions.Forward,
			[KeyCode.S]: FreeLookControlSystem.Actions.Back,
			[KeyCode.A]: FreeLookControlSystem.Actions.Left,
			[KeyCode.D]: FreeLookControlSystem.Actions.Right,
			[KeyCode.ArrowUp]: FreeLookControlSystem.Actions.Forward,
			[KeyCode.ArrowDown]: FreeLookControlSystem.Actions.Back,
			[KeyCode.ArrowLeft]: FreeLookControlSystem.Actions.Left,
			[KeyCode.ArrowRight]: FreeLookControlSystem.Actions.Right,
			[KeyCode.Space]: FreeLookControlSystem.Actions.Up,
			[KeyCode.ControlLeft]: FreeLookControlSystem.Actions.Down,
			[KeyCode.ControlRight]: FreeLookControlSystem.Actions.Down,
			[KeyCode.ShiftLeft]: FreeLookControlSystem.Actions.Sprint,
			[KeyCode.ShiftRight]: FreeLookControlSystem.Actions.Sprint,
		},
	};

	lookSpeed = FreeLookControlSystem.Defaults.LookSpeed;
	moveSpeed = FreeLookControlSystem.Defaults.MoveSpeed;
	friction = FreeLookControlSystem.Defaults.Friction;
	sprintMultiplier = FreeLookControlSystem.Defaults.SprintMult;

	constructor(
		config: {
			lookSpeed?: number;
			moveSpeed?: number;
			friction?: number;
			sprintMultiplier?: number;
		} = {},
	) {
		super();
		this.lookSpeed = config.lookSpeed ?? this.lookSpeed;
		this.moveSpeed = config.moveSpeed ?? this.moveSpeed;
		this.friction = config.friction ?? this.friction;
		this.sprintMultiplier = config.sprintMultiplier ?? this.sprintMultiplier;
	}

	override startup() {
		this.whenShutdown(
			Input.on(MouseMoveEvent, this.onMouseMove),
			Input.on(KeyDownEvent, this.onKeyPress),
			Input.on(KeyUpEvent, this.onKeyPress),
		);
	}

	override update(delta: number) {
		for (let [, transform, freeLook] of this.world.entitiesWith(
			Transform,
			FreeLookComponent,
		)) {
			rotation: if (Input.mouseDown(MouseCode.MouseLeft)) {
				const movementX = this.mouseDelta.x ?? 0;
				const movementY = this.mouseDelta.y ?? 0;

				if (!isNumber(movementX) && !isNumber(movementY)) break rotation;

				freeLook.euler.y -= movementX * this.lookSpeed * delta;
				freeLook.euler.x -= movementY * this.lookSpeed * delta;
				freeLook.euler.x = clamp(freeLook.euler.x, -60, 60);

				// set transform rotation
				freeLook.euler.z = 0;
				transform.rotation.setFromEuler(freeLook.euler);
			}

			this.mouseDelta.x = 0;
			this.mouseDelta.y = 0;

			// movements
			let actualMoveSpeed = delta * this.moveSpeed;
			const { press } = this.keyState;
			if (press & SPRINT) {
				actualMoveSpeed *= this.sprintMultiplier;
			}
			if (press & FORWARD) {
				freeLook.velocity.z = -actualMoveSpeed;
			}
			if (press & BACK) {
				freeLook.velocity.z = actualMoveSpeed;
			}
			if (press & LEFT) {
				freeLook.velocity.x = -actualMoveSpeed;
			}
			if (press & RIGHT) {
				freeLook.velocity.x = actualMoveSpeed;
			}
			if (press & UP) {
				freeLook.velocity.y = actualMoveSpeed;
			}
			if (press & DOWN) {
				freeLook.velocity.y = -actualMoveSpeed;
			}

			freeLook.velocity.multiplyScalar(this.friction);
			let veloLen = freeLook.velocity.length() || 1;
			freeLook.velocity.divideScalar(veloLen);
			freeLook.velocity.multiplyScalar(clamp(veloLen, 0, this.moveSpeed));
			transform.translateX(freeLook.velocity.x);
			transform.translateY(freeLook.velocity.y);
			transform.translateZ(freeLook.velocity.z);

			this.keyState.prevPress = press;
		}
	}

	override shutdown() {
		this.keyState.press = 0;
		this.keyState.prevPress = 0;
	}

	onMouseMove = (e: any) => {
		this.mouseDelta.x = e.movementX;
		this.mouseDelta.y = e.movementY;
	};

	protected onKeyPress = (
		e: EventData<typeof KeyDownEvent> | EventData<typeof KeyUpEvent>,
	) => {
		const { press } = this.keyState;
		let isPressed = e.down;
		let newPress = press;
		switch (
			FreeLookControlSystem.Defaults.Keymap[
				e.code as keyof typeof FreeLookControlSystem.Defaults.Keymap
			]
		) {
			case FreeLookControlSystem.Actions.Forward:
				isPressed ? (newPress |= FORWARD) : (newPress &= ~FORWARD);
				break;
			case FreeLookControlSystem.Actions.Back:
				isPressed ? (newPress |= BACK) : (newPress &= ~BACK);
				break;
			case FreeLookControlSystem.Actions.Left:
				isPressed ? (newPress |= LEFT) : (newPress &= ~LEFT);
				break;
			case FreeLookControlSystem.Actions.Right:
				isPressed ? (newPress |= RIGHT) : (newPress &= ~RIGHT);
				break;
			case FreeLookControlSystem.Actions.Up:
				isPressed ? (newPress |= UP) : (newPress &= ~UP);
				break;
			case FreeLookControlSystem.Actions.Down:
				isPressed ? (newPress |= DOWN) : (newPress &= ~DOWN);
				break;
			case FreeLookControlSystem.Actions.Sprint:
				isPressed ? (newPress |= SPRINT) : (newPress &= ~SPRINT);
				break;
			default:
				break;
		}
		this.keyState.press = newPress;
	};

	protected mouseDelta = new Vector2();
	protected keyState = { press: 0, prevPress: 0 };
}

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
		renderer: WebGLRenderer,
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
