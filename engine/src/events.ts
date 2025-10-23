import { autobind } from "./decorators.ts";
import { AutoMap } from "./structures.ts";

export type EventType<T> = string & { type: T };

export type EventData<T extends EventType<any>> = T["type"];

export const createEvent = <T = undefined>(type: string): EventType<T> =>
	type as EventType<T>;

export const extractEventString = (event: EventType<any>): string => event;

export let createEventPayload = <T extends EventType<any>>(data: T["type"]) =>
	data;

/**
 * Simple typed event bus.
 */
export class EventManager {
	@autobind register<T extends EventType<any>>(
		type: T,
		listener: (value: T extends EventType<infer U> ? U : never) => void,
	): VoidFunction {
		this.listeners.get(type).add(listener);
		return () => this.unregister(type, listener);
	}

	@autobind unregister<T extends EventType<any>>(
		type: T,
		listener: Function,
	): void {
		this.listeners.get(type).delete(listener);
	}

	notify<T extends EventType<undefined>>(event: T): void;
	notify<T extends EventType<any>>(
		event: T,
		data: T extends EventType<infer U> ? U : never,
	): void;
	@autobind notify<T extends EventType<any>>(
		event: T,
		data?: T extends EventType<infer U> ? U : never,
	): void {
		let listeners = this.listeners.get(event);
		for (const listener of listeners) {
			listener(data);
		}
	}

	clear = () => this.listeners.clear();

	protected listeners = new AutoMap<EventType<any>, Set<Function>>(
		() => new Set(),
	);
}

/** Double buffered event queue that supports read-after-dispatching. */
export class EventQueue {
	/**
	 * Push an event to the queue.
	 * @param event
	 */
	@autobind push<T>(event: EventType<T>, payload: EventType<T>["type"]) {
		if (this.hasFlushed) {
			this.nextQueue.push(event, payload);
			return;
		}
		this.queue.push(event, payload);
	}

	/**
	 * Dispatch all events in the queue.
	 * Does *not* clear the queue.
	 */
	@autobind dispatchQueue() {
		this.hasFlushed = true;
		for (let i = 0; i < this.queue.length; i += 2) {
			let event = this.queue[i];
			let payload = this.queue[i + 1];
			let listeners = this.listeners.get(event);
			for (const listener of listeners) {
				ELYSIA_DEV: {
					try {
						listener(payload);
					} catch (cause) {
						throw Error(`Error calling queued event ${event}`, { cause });
					}
				}
				ELYSIA_PROD: {
					listener(payload);
				}
			}
		}
	}

	/**
	 * Dispatch all events in the queue and clear it.
	 */
	@autobind dispatchAndClear() {
		this.dispatchQueue();
		this.clear();
	}

	/**
	 * Clear the queue.
	 */
	@autobind clear() {
		const temp = this.queue;
		temp.length = 0;
		this.queue = this.nextQueue;
		this.nextQueue = temp;
		this.hasFlushed = false;
	}

	/**
	 * Subscribe to an event.
	 * @param type
	 * @param listener
	 */
	@autobind subscribe<T extends EventType<any>>(
		type: T,
		listener: (value: T["type"]) => void,
	): VoidFunction {
		this.listeners.get(type).add(listener);
		return () => void this.unsubscribe(type, listener);
	}

	/**
	 * Unsubscribe from an event.
	 * @param type
	 * @param listener
	 */
	@autobind unsubscribe<T extends EventType<any>>(
		type: T,
		listener: (value: T["type"]) => void,
	): void {
		this.listeners.get(type).delete(listener);
	}

	*[Symbol.iterator](): IterableIterator<[EventType<unknown>, unknown]> {
		for (let i = 0; i < this.queue.length; i += 2) {
			yield [this.queue[i], this.queue[i + 1]];
		}
	}

	protected readonly listeners = new AutoMap<
		EventType<any>,
		Set<(value: any) => void>
	>(() => new Set());

	protected queue: any[] = [];

	protected nextQueue: any[] = [];

	protected hasFlushed = false;
}
