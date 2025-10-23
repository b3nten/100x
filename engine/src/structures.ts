//  █████╗ ██╗   ██╗████████╗ ██████╗ ███╗   ███╗ █████╗ ██████╗
// ██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗████╗ ████║██╔══██╗██╔══██╗
// ███████║██║   ██║   ██║   ██║   ██║██╔████╔██║███████║██████╔╝
// ██╔══██║██║   ██║   ██║   ██║   ██║██║╚██╔╝██║██╔══██║██╔═══╝
// ██║  ██║╚██████╔╝   ██║   ╚██████╔╝██║ ╚═╝ ██║██║  ██║██║
// ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝

/**
 * Map that accepts a factory function to auto-initialize
 * values upon access to non-initalized keys.
 */
export class AutoMap<K, V> extends Map<K, V> {
	constructor(protected factory: () => V) {
		super();
	}

	/**
	 * Get the associated value from key, creating a new
	 * item from the factory if it does not exist.
	 * @param key
	 */
	override get(key: K): V {
		if (!super.has(key)) {
			this.set(key, this.factory());
		}
		return super.get(key)!;
	}
}

// ███████╗██████╗  █████╗ ██████╗ ███████╗███████╗███████╗███████╗████████╗
// ██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔════╝██╔════╝██╔════╝╚══██╔══╝
// ███████╗██████╔╝███████║██████╔╝███████╗█████╗  ███████╗█████╗     ██║
// ╚════██║██╔═══╝ ██╔══██║██╔══██╗╚════██║██╔══╝  ╚════██║██╔══╝     ██║
// ███████║██║     ██║  ██║██║  ██║███████║███████╗███████║███████╗   ██║
// ╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚══════╝   ╚═╝

/**
 * A sparse set that stores components of type T.
 * @typeParam T The type of the components to store.
 */
export class SparseSet<T> {
	/**
	 * The number of entities in the set.
	 */
	get size(): number {
		return this.dense.length;
	}

	/**
	 * The first component in the set.
	 */
	get first(): T | undefined {
		if (this.size === 0) return undefined;
		return this.components[0];
	}

	/**
	 * Add an entity and its component to the set.
	 */
	add(entity: number, component: T): boolean {
		if (this.has(entity)) return false;
		const index = this.dense.length;
		this.dense.push(entity);
		this.sparse[entity] = index;
		this.components[index] = component;
		return true;
	}

	/**
	 * Remove an entity and it's component from the set.
	 */
	remove(entity: number) {
		if (!this.has(entity)) return;
		const index = this.sparse[entity];
		const component = this.components[index];
		delete this.sparse[entity];
		delete this.components[index];
		delete this.dense[index];
		const lastDenseItem = this.dense.pop();
		const lastComponentItem = this.components.pop();
		if (lastDenseItem !== undefined) {
			this.sparse[lastDenseItem] = index;
			this.components[index] = lastComponentItem!;
			this.dense[index] = lastDenseItem;
		} else {
			this.dense.length = 0;
			this.components.length = 0;
			this.sparse.length = 0;
		}
	}

	/**
	 * Get the component of an entity.
	 */
	get(entity: number): T | undefined {
		if (!this.has(entity)) return undefined;
		return this.components[this.sparse[entity]];
	}

	/**
	 * Check if an entity is in the set.
	 */
	has(entity: number): boolean {
		return this.sparse[entity] !== undefined;
	}

	/**
	 * Clear the set.
	 */
	clear() {
		this.dense.length = 0;
		this.components.length = 0;
		this.sparse.length = 0;
	}

	/**
	 * Iterate over the set, returning a tuple [entity, component]
	 */
	*[Symbol.iterator](): Iterator<[entity: number, component: T]> {
		for (let i = 0; i < this.dense.length; i++) {
			yield [this.dense[i], this.components[i]];
		}
	}

	private sparse: number[] = [];
	private dense: number[] = [];
	private components: T[] = [];
}

//  ██████╗ ██████╗      ██╗    ██████╗  ██████╗  ██████╗ ██╗
// ██╔═══██╗██╔══██╗     ██║    ██╔══██╗██╔═══██╗██╔═══██╗██║
// ██║   ██║██████╔╝     ██║    ██████╔╝██║   ██║██║   ██║██║
// ██║   ██║██╔══██╗██   ██║    ██╔═══╝ ██║   ██║██║   ██║██║
// ╚██████╔╝██████╔╝╚█████╔╝    ██║     ╚██████╔╝╚██████╔╝███████╗
//  ╚═════╝ ╚═════╝  ╚════╝     ╚═╝      ╚═════╝  ╚═════╝ ╚══════╝

interface ObjectPoolOptions<T> {
	/** Initial size of the pool */
	initialSize: number;
	/** Factory function to create new objects */
	createObject: (index: number) => T;
	/** Optional function to reset objects when they are created and freed */
	resetObject?: (object: T) => void;
	/** Optional function to determine how many objects to add when the pool grows */
	growthStrategy?: (currentSize: number) => number;
}

/**
 * A pool of reusable objects to minimize allocations.
 * The pool will automatically grow when needed.
 * @typeParam T The type of objects in the pool.
 * @param options Configuration options for the pool.
 * - initialSize: The initial number of objects in the pool.
 * - createObject: A factory function to create new objects.
 * - resetObject: An optional function to reset objects when they are freed. Also called on initial creation.
 * - growthStrategy: An optional function to determine how many objects to add when the pool grows.
 */
export class ObjectPool<T> {
	constructor(options: ObjectPoolOptions<T>) {
		this.createObject = options.createObject;
		this.resetObject = options.resetObject;

		for (let index = 0; index < options.initialSize; index++) {
			const object = this.createObject(index);
			this.resetObject?.(object);
			this.inactive.push(object);
		}
	}

	/** Allocate an object from the pool */
	alloc() {
		let object = this.inactive.pop();
		// No more objects in the pool
		if (!object) {
			object = this.createObject(this.size);
		}
		// double the pool size
		for (let i = 0; i < this.growthStrategy(this.size); i++) {
			for (let index = 0; index < this.active.size; index++) {
				const object = this.createObject(index);
				this.resetObject?.(object);
				this.inactive.push(object);
			}
		}
		this.active.add(object);
		return object;
	}

	/** Release an object back into the pool */
	free(object: T) {
		if (this.active.has(object)) {
			this.active.delete(object);
			this.inactive.push(object);
			this.resetObject?.(object);
		}
	}

	/** Release all active objects back into the pool */
	freeAll() {
		for (const activeObject of this.active) {
			this.inactive.push(activeObject);
		}
		this.active.clear();
	}

	/** Total number of objects managed by the pool */
	get size() {
		return this.inactive.length + this.active.size;
	}

	/** Number of active objects */
	get sizeOfActive() {
		return this.active.size;
	}

	/** Number of inactive objects */
	get sizeOfReserve() {
		return this.inactive.length;
	}

	protected inactive: T[] = [];
	protected active = new Set<T>();
	protected createObject: (index: number) => T;
	protected resetObject?: (object: T) => void;
	protected growthStrategy: (currentSize: number) => number = (it) => it * 2;
}
