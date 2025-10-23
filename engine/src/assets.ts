import type { ConstructorOf, Serializable } from "./types.ts";
import { createEvent, EventManager } from "./events.ts";
import { assert } from "./asserts.ts";

declare global {
	interface PromiseConstructor {
		withResolvers<T>(): {
			promise: Promise<T>;
			resolve: (value: T | PromiseLike<T>) => void;
			reject: (reason?: unknown) => void;
		};
	}
}

if (typeof Promise.withResolvers === "undefined") {
	Promise.withResolvers = <T>() => {
		let resolve: (value: T | PromiseLike<T>) => void;
		let reject: (reason?: unknown) => void;
		const promise = new Promise<T>((res, rej) => {
			resolve = res;
			reject = rej;
		});
		return { promise, resolve: resolve!, reject: reject! };
	};
}

//  █████╗ ███████╗███████╗███████╗████████╗
// ██╔══██╗██╔════╝██╔════╝██╔════╝╚══██╔══╝
// ███████║███████╗███████╗█████╗     ██║
// ██╔══██║╚════██║╚════██║██╔══╝     ██║
// ██║  ██║███████║███████║███████╗   ██║
// ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝   ╚═╝

export abstract class Asset<T> implements Promise<T> {
	state: "idle" | "loading" | "loaded" | "error" = "idle";

	data?: T;

	error?: unknown;

	promise = Promise.withResolvers<T>();

	unwrap = (): T => {
		ELYSIA_DEV: {
			if (this.state !== "loaded") {
				throw Error(
					`unwrap() called on asset ${this.constructor.name} that is not loaded or has errored.`,
				);
			}
			if (!this.data) {
				throw Error(
					`unwrap() called on asset ${this.constructor.name} that has no data.`,
				);
			}
			return this.data;
		}
		ELYSIA_PROD: {
			return this.data!;
		}
	};

	load = (): Promise<T> => {
		if (this.state === "loaded" || this.state === "loading") {
			return this.promise.promise;
		}

		this.state = "loading";

		try {
			this.loadImpl()
				.then((x) => {
					if (x instanceof Error) {
						this.error = x;
						this.state = "error";
						this.promise.reject(x);
					} else {
						this.data = x;
						this.state = "loaded";
						this.promise.resolve(x);
					}
				})
				.catch((e) => {
					this.error = e;
					this.state = "error";
					this.promise.reject(e);
				});
		} catch (e) {
			this.error = e;
			this.state = "error";
			this.promise.reject(e);
		}

		return this.promise.promise;
	};

	abstract loadImpl(): Promise<T | Error>;

	protected destructor?(): void;

	then<TResult1 = T, TResult2 = never>(
		onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
	): Promise<TResult1 | TResult2> {
		if (this.state === "idle") this.load();
		return this.promise.promise.then(onfulfilled, onrejected);
	}

	catch<TResult = never>(
		onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
	): Promise<T | TResult> {
		return this.promise.promise.catch(onrejected);
	}

	finally(onfinally?: (() => void) | null): Promise<T> {
		return this.promise.promise.finally(onfinally);
	}

	get [Symbol.toStringTag]() {
		return "Promise";
	}
}

// ██╗      ██████╗  █████╗ ██████╗ ███████╗██████╗ ███████╗
// ██║     ██╔═══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔════╝
// ██║     ██║   ██║███████║██║  ██║█████╗  ██████╔╝███████╗
// ██║     ██║   ██║██╔══██║██║  ██║██╔══╝  ██╔══██╗╚════██║
// ███████╗╚██████╔╝██║  ██║██████╔╝███████╗██║  ██║███████║
// ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝

export class TextAsset extends Asset<string> {
	constructor(private url: string) {
		super();
	}
	override async loadImpl(): Promise<string> {
		const res = await fetch(this.url);
		if (!res.ok) throw new Error(`Failed to load Text asset: ${this.url}`);
		return res.text();
	}
}

export class JSONAsset extends Asset<Serializable> {
	constructor(private url: string) {
		super();
	}
	override async loadImpl(): Promise<Serializable> {
		const res = await fetch(this.url);
		if (!res.ok) throw new Error(`Failed to load JSON asset: ${this.url}`);
		return res.json();
	}
}

export class ArrayBufferAsset extends Asset<ArrayBuffer> {
	constructor(private url: string) {
		super();
	}
	override async loadImpl(): Promise<ArrayBuffer> {
		const r = await fetch(this.url);
		return await r.arrayBuffer();
	}
}

export class ImageAsset extends Asset<HTMLImageElement> {
	constructor(private url: string) {
		super();
	}
	override loadImpl(): Promise<HTMLImageElement> {
		return new Promise<HTMLImageElement>((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = this.url;
		});
	}
}

// ███████╗██╗   ██╗███████╗███╗   ██╗████████╗███████╗
// ██╔════╝██║   ██║██╔════╝████╗  ██║╚══██╔══╝██╔════╝
// █████╗  ██║   ██║█████╗  ██╔██╗ ██║   ██║   ███████╗
// ██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║╚██╗██║   ██║   ╚════██║
// ███████╗ ╚████╔╝ ███████╗██║ ╚████║   ██║   ███████║
// ╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝

export const progressEvent = createEvent<number>(
	"Elysia::AssetLoaderProgressEvent",
);
export const errorEvent = createEvent<Error>("Elysia::AssetLoaderErrorEvent");
export const loadedEvent = createEvent<AssetLoader<any>>(
	"Elysia::AssetLoaderLoadedEvent",
);

// ██╗      ██████╗  █████╗ ██████╗ ███████╗██████╗
// ██║     ██╔═══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗
// ██║     ██║   ██║███████║██║  ██║█████╗  ██████╔╝
// ██║     ██║   ██║██╔══██║██║  ██║██╔══╝  ██╔══██╗
// ███████╗╚██████╔╝██║  ██║██████╔╝███████╗██║  ██║
// ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝

export class AssetLoader<A extends Record<string, Asset<any>>>
	implements Promise<A>
{
	state: "idle" | "loading" | "loaded" | "error" = "idle";

	promise = Promise.withResolvers<A>();

	progress = 0;

	protected emitter = new EventManager();

	register = this.emitter.register.bind(this.emitter);

	unregister = this.emitter.unregister.bind(this.emitter);

	constructor(public assets: A) {}

	/**
	 * Initiates the loading process for all assets.
	 */
	async load(): Promise<A> {
		if (this.state === "loading" || this.state === "loaded") {
			return this.promise.promise;
		}

		// load asset
		this.state = "loading";

		let promises: Promise<unknown>[] = [];
		let settled = 0;

		for (const asset of Object.values(this.assets)) {
			promises.push(
				asset
					.load()
					.then((a) => {
						this.progress = ++settled / promises.length;
						this.emitter.notify(progressEvent, this.progress);
					})
					.catch((e) => {
						this.state = "error";
						this.emitter.notify(errorEvent, e);
						this.promise.reject(e);
					}),
			);
		}

		try {
			await Promise.all(promises);
			this.state = "loaded";
			this.progress = 1;
			this.emitter.notify(loadedEvent, this);
			this.promise.resolve(this.assets);
		} catch {
			this.state = "error";
			this.emitter.notify(errorEvent, new Error("Failed to load assets"));
			this.promise.reject();
		}
		return this.promise.promise;
	}

	unwrap<T extends keyof A>(type: T): NonNullable<A[T]["data"]>;
	unwrap<T extends ConstructorOf<Asset<any>>>(
		type: T,
		key: string,
	): NonNullable<InstanceType<T>["data"]>;
	unwrap<T>(type: T, key?: string) {
		assert(
			this.state === "loaded",
			"Cannot unwrap asset from loader which is not loaded!",
		);
		if (typeof key === "string") {
			const maybeAsset = this.assets[key];
			if (!maybeAsset) throw new Error("Asset not found.");
			if (!(maybeAsset instanceof (type as ConstructorOf<Asset<any>>)))
				throw new Error("Asset type mismatch.");
			return maybeAsset.data;
		}
		const maybeAsset = this.assets[type as keyof A];
		if (!maybeAsset) throw new Error("Asset not found.");
		return maybeAsset.data;
	}

	/**
	 * Retrieves an asset instance by its key.
	 * @template T The type of the asset to retrieve.
	 * @param {T | string} a The key of the asset.
	 * @returns {[T] | T | undefined} The asset instance or undefined if not found.
	 */
	get<T extends keyof A>(a: T): A[T];
	get<T extends Asset<any>>(a: string): T | undefined;
	get<T extends Asset<any>>(a: string): T | undefined {
		return this.assets[a] as T;
	}

	// biome-ignore lint/suspicious/noThenProperty: <explanation>
	then<TResult1 = A, TResult2 = never>(
		onfulfilled?: ((value: A) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
	): Promise<TResult1 | TResult2> {
		if (this.state === "idle") this.load();
		return this.promise.promise.then(onfulfilled, onrejected);
	}

	catch<TResult = never>(
		onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
	): Promise<A | TResult> {
		return this.promise.promise.catch(onrejected) as Promise<A | TResult>;
	}

	finally(onfinally?: (() => void) | null): Promise<A> {
		return this.promise.promise.finally(onfinally) as Promise<A>;
	}

	get [Symbol.toStringTag]() {
		return "Promise";
	}
}
