import { Asset } from "../assets.ts";
import * as Three from "three";
import { DRACOLoader, RGBELoader } from "three/examples/jsm/Addons.js";
import {
	type GLTF,
	GLTFLoader,
} from "three/examples/jsm/loaders/GLTFLoader.js";

export class TextureAsset extends Asset<Three.Texture> {
	static TextureLoader: Three.TextureLoader = new Three.TextureLoader();
	constructor(private url: string) {
		super();
	}
	override loadImpl(): Promise<Three.Texture> {
		return new Promise<Three.Texture>((resolve, reject) => {
			TextureAsset.TextureLoader.load(this.url, resolve, undefined, reject);
		});
	}

	protected destructor() {
		this.data?.dispose();
	}
}

export class RGBEAsset extends Asset<Three.DataTexture> {
	static Loader: RGBELoader = new RGBELoader();
	constructor(public url: string) {
		super();
	}
	override loadImpl(): Promise<Three.DataTexture> {
		return new Promise<Three.DataTexture>((resolve, reject) =>
			RGBEAsset.Loader.load(this.url, resolve, undefined, reject),
		);
	}
	protected destructor() {
		this.data?.dispose();
	}
}

type GLTFAssetType = {
	gltf: GLTF;
	clone: () => GLTF["scene"];
};

export class GLTFAsset extends Asset<GLTFAssetType> {
	static GLTFLoader: GLTFLoader = new GLTFLoader();
	static DracoLoader: DRACOLoader = new DRACOLoader();
	static setDracoDecoderPath(path: string) {
		GLTFAsset.DracoLoader.setDecoderPath(path);
		GLTFAsset.GLTFLoader.setDRACOLoader(GLTFAsset.DracoLoader);
	}
	constructor(private url: string) {
		super();
	}
	override loadImpl(): Promise<GLTFAssetType> {
		return new Promise<GLTFAssetType>((resolve, reject) => {
			GLTFAsset.GLTFLoader.load(
				this.url,
				(gltf) => resolve({ gltf: gltf, clone: () => gltf.scene.clone(true) }),
				undefined,
				reject,
			);
		});
	}
	protected destructor() {
		this.data?.gltf.scene.traverse((o) => {
			if (o instanceof Three.Mesh) {
				o.geometry.dispose();
				o.material.dispose();
			}
		});
	}
}

export class DataTextureAsset extends Asset<Three.DataTexture> {
	static Loader: Three.DataTextureLoader = new Three.DataTextureLoader();
	constructor(public url: string) {
		super();
	}
	override loadImpl(): Promise<Three.DataTexture> {
		return new Promise<Three.DataTexture>((resolve, reject) =>
			DataTextureAsset.Loader.load(this.url, resolve, undefined, reject),
		);
	}
	protected destructor() {
		this.data?.dispose();
	}
}
