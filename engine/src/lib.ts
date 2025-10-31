import type { ConstructorOf } from "./types.ts";

/**
 * A clock utility to track elapsed time and delta time between frames.
 */
export class Clock {
	public get delta(): number {
		return this.#delta;
	}

	public get elapsed(): number {
		return this.#elapsed;
	}

	public capture(): void {
		if (!this.#started) {
			this.#started = true;
			this.#now = performance.now();
			this.#last = this.#now;
			return;
		}
		this.#now = performance.now();
		this.#delta = Math.max(
			0.00001,
			Math.min((this.#now - this.#last) / 1000, 0.06),
		);
		this.#elapsed += this.#delta;
		this.#last = this.#now;
	}

	#started = false;
	#now = 0;
	#last = 0;
	#delta = 0.016;
	#elapsed = 0;
}

/**
 * A simple frameloop utility that calls an update function on each animation frame.
 */
export class Frameloop {
	stopped = false;
	paused = false;
	clock = new Clock();

	constructor(updateFunction: (frametime: number, elapsed: number) => void) {
		this.clock.capture();
		this.#frameLoopUpdate = () => {
			if (this.stopped) return;
			if (!this.paused) {
				this.clock.capture();
				updateFunction(this.clock.delta, this.clock.elapsed);
			}
			requestAnimationFrame(this.#frameLoopUpdate);
		};
		requestAnimationFrame(this.#frameLoopUpdate);
	}

	pause = () => {
		this.paused = true;
	};

	resume = () => {
		this.paused = false;
	};

	stop = () => {
		this.stopped = true;
	};

	readonly #frameLoopUpdate: () => void;
}

/**
 * Used for managing instrumentation marks and measures.
 * It only contains implementation code in instrumented builds,
 * so it's safe to leave calls in production code.
 */
export class Instrumentor {
	static start(name: string) {
		ELYSIA_INSTRUMENT: performance.mark(`${name}::start`);
	}

	static end(name: string) {
		ELYSIA_INSTRUMENT: {
			performance.mark(`${name}::end`);
			performance.measure(name, `${name}::start`, `${name}::end`);
		}
	}

	constructor(public name: string) {
		ELYSIA_INSTRUMENT: Instrumentor.start(name);
	}

	end() {
		ELYSIA_INSTRUMENT: Instrumentor.end(this.name);
	}
}

/**
 * Creates an instance of a class with the given constructor and arguments.
 */
export function make<T, Args extends any[]>(
	ctor: ConstructorOf<T, Args>,
	...args: Args
): T {
	return new ctor(...args) as T;
}

/**
 * Runs a function and returns its result.
 * @param fn
 */
export function run<T>(fn: () => T) {
	return fn();
}

export type Result<T, E = unknown> =
	| { ok: true; value: T }
	| { ok: false; error: E };

export const Ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * Runs a function and catches any errors, logging them to the console.
 * @param fn
 */
export function runSafe<T>(fn: () => T): T | undefined {
	try {
		const result = fn();
		if (result instanceof Promise) {
			return result.catch((e) => {
				console.error(e);
			}) as T;
		}
		return result;
	} catch (e) {
		console.error(e);
	}
}

/**
 * Runs a function and returns a Result indicating success or failure.
 * @param fn
 */
export function runCatching<T>(
	fn: () => T,
): T extends Promise<infer U> ? Promise<Result<U>> : Result<T> {
	try {
		const result = fn();
		if (result instanceof Promise) {
			return result.then(Ok).catch(Err) as any;
		}
		return Ok(result) as any;
	} catch (e) {
		return Err(e) as any;
	}
}

/**
 * Runs a function that may return a Promise, and always returns a Promise.
 * @param fn
 */
export function runAsync<T>(fn: () => T | Promise<T>) {
	const result = fn();
	if (result instanceof Promise) {
		return result;
	}
	return Promise.resolve(result);
}

/* A no-operation function that does nothing. */
export function noop() {}

/* Schedules a callback to run on the next tick of the event loop. */
export function runNextTick(callback: () => void) {
	setTimeout(callback, 0);
}

/* Schedules a callback to run on the next animation frame. */
export function runNextFrame(callback: () => void) {
	requestAnimationFrame(() => runNextTick(callback));
}

/* Runs an asynchronous function without awaiting its result. */
export function runAndForget<T>(callback: () => Promise<T>) {
	callback();
}

/* Gets the constructor of an object. */
export function constructorOf<T extends Object>(ctor: T): ConstructorOf<T> {
	return ctor.constructor as ConstructorOf<T>;
}

export function forEach<T>(
	iterable: Iterable<T>,
	callback: (item: T, index: number) => void,
): void {
	let index = 0;
	for (const item of iterable) {
		callback(item, index++);
	}
}
