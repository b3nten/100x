// Ambient scope function declarations
declare global {
	interface Object {
		/**
		 * Calls the function with this as argument and returns this.
		 * Useful for side effects while maintaining the original value.
		 */
		also<T extends this>(
			this: NonNullable<T>,
			block: (it: NonNullable<T>) => void,
		): T;
		/**
		 * Calls the function with this as the context and returns the result.
		 */
		run<T extends NonNullable<this>, R>(
			this: T,
			block: (this: NonNullable<T>, self: NonNullable<T>) => R,
		): R;
		/**
		 * Calls the function with this as the context and returns the result.
		 */
		maybe<T extends this | null | undefined, R>(
			this: T,
			block: (this: NonNullable<T>, self: NonNullable<T>) => R,
		): R;
	}
}

export {};
