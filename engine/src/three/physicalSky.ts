import * as Three from "three/webgpu";
import { SkyMesh as SkyImpl } from "three/addons/objects/SkyMesh.js";
import type { Component } from "../ecs.ts";

/**
 * Physically correct Skybox Component.
 */
export class PhysicalSky extends Three.Object3D implements Component {
	/**
	 * The turbidity of the sky.
	 */
	get turbidity(): number {
		return this.object3d.turbidity.value;
	}

	set turbidity(v: number) {
		this.object3d.turbidity.value;
	}

	/**
	 * The rayleigh scattering coefficient.
	 */
	get rayleigh(): number {
		return this.object3d.rayleigh.value;
	}

	set rayleigh(v: number) {
		this.object3d.rayleigh.value = v;
	}

	/**
	 * The mie scattering coefficient.
	 */
	get mieCoefficient(): number {
		return this.object3d.mieCoefficient.value;
	}

	set mieCoefficient(v: number) {
		this.object3d.mieCoefficient.value = v;
	}

	/**
	 * The mie scattering direction.
	 */
	get mieDirectionalG(): number {
		return this.object3d.mieDirectionalG.value;
	}

	set mieDirectionalG(v: number) {
		this.object3d.mieDirectionalG.value = v;
	}

	/**
	 * The sun's position in the sky (height).
	 */
	get elevation(): number {
		return this.#elevation;
	}

	set elevation(v: number) {
		this.#elevation = v;
		this.updateSunPosition();
	}

	/**
	 * The sun's position in the sky (rotation / azimuth).
	 */
	get azimuth(): number {
		return this.#azimuth;
	}

	set azimuth(v: number) {
		this.#azimuth = v;
		this.updateSunPosition();
	}

	get material() {
		return this.object3d.material;
	}

	get sunlight(): Three.DirectionalLight {
		return this.#dirLight;
	}

	constructor(
		args: {
			turbidity?: number;
			rayleigh?: number;
			mieCoefficient?: number;
			mieDirectionalG?: number;
			elevation?: number;
			azimuth?: number;
		} = {},
	) {
		super();
		this.object3d.scale.setScalar(450000);
		this.add(this.object3d);
		this.add(this.#dirLight);
		if (args.turbidity !== undefined) {
			this.turbidity = args.turbidity;
		}
		if (args.rayleigh !== undefined) {
			this.rayleigh = args.rayleigh;
		}
		if (args.mieCoefficient !== undefined) {
			this.mieCoefficient = args.mieCoefficient;
		}
		if (args.mieDirectionalG !== undefined) {
			this.mieDirectionalG = args.mieDirectionalG;
		}
		if (args.elevation !== undefined) {
			this.#elevation = args.elevation;
		}
		if (args.azimuth !== undefined) {
			this.#azimuth = args.azimuth;
		}
		this.updateSunPosition();
		this.object3d.updateMatrixWorld();
	}

	private updateSunPosition() {
		const phi = Three.MathUtils.degToRad(90 - this.#elevation);
		const theta = Three.MathUtils.degToRad(this.#azimuth);
		this.#sunPosition.setFromSphericalCoords(20, phi, theta);
		this.#dirLight.position.copy(this.#sunPosition);
		this.#dirLight.lookAt(new Three.Vector3(0, 0, 0));
		this.object3d.sunPosition.value.copy(this.#sunPosition);
		this.object3d.material.needsUpdate = true;
		this.object3d.matrixWorldNeedsUpdate = true;
	}

	object3d = new SkyImpl();
	#sunPosition = new Three.Vector3();
	#elevation = 2;
	#azimuth = 180;
	#dirLight = new Three.DirectionalLight(0xffffff, 1.5);
}
