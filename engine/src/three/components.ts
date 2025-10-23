import type { Component, EntityID, World } from "../ecs.ts";
import { Matrix4, Object3D, Quaternion, Vector3 } from "three";
import { Relationship } from "../ecs.ts";
import * as Three from "three";
import type { WebGLRenderer } from "three";

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
	constructor(public value: WebGLRenderer | Three.WebGPURenderer) {}
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
