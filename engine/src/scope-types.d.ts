/*
MIT License

Copyright (c) 2020 TheDavidDelta

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
export {};

declare global {
	interface Object {
		/**
		 * Calls the specified function block with `this` value as its argument and returns its result
		 * @param block - The function to be executed with `this` as argument
		 * @returns `block`'s result
		 */
		let<T, R>(this: T | null | undefined, block: (it: T) => R): R;
		/**
		 * Calls the specified function block with `this` value as its argument and returns `this` value
		 * @param block - The function to be executed with `this` as argument
		 * @returns `this`
		 */
		also<T>(this: T | null | undefined, block: (it: T) => void): T;
		/**
		 * Calls the specified function block with `this` value as its receiver and returns its value
		 * @param block - The function to be executed with `this` as context
		 * @returns `block`'s result
		 */
		run<T, R>(this: T | null | undefined, block: (this: T) => R): R;
		/**
		 * Calls the specified function block with `this` value as its receiver and returns `this` value
		 * @param block - The function to be executed with `this` as context
		 * @returns `this`
		 */
		apply<T>(this: T | null | undefined, block: (this: T) => void): T;
		/**
		 * Returns `this` value if it satisfies the given predicate or `undefined` if it doesn't
		 * @param predicate - The function to be executed with `this` as argument and returns a truthy or falsy value
		 * @returns `this` or `undefined`
		 */
		takeIf<T>(
			this: T | null | undefined,
			predicate: (it: T) => boolean,
		): T | undefined;
		/**
		 * Returns `this` value if it does not satisfy the given predicate or `undefined` if it does
		 * @param predicate - The function to be executed with `this` as argument and returns a truthy or falsy value
		 * @returns `this` or `undefined`
		 */
		takeUnless<T>(
			this: T | null | undefined,
			predicate: (it: T) => boolean,
		): T | undefined;
	}
	interface Number {
		/**
		 * Calls the specified function block with `this` value as its argument and returns its result
		 * @param block - The function to be executed with `this` as argument
		 * @returns `block`'s result
		 */
		let<R>(this: Number | null | undefined, block: (it: number) => R): R;
		/**
		 * Calls the specified function block with `this` value as its argument and returns `this` value
		 * @param block - The function to be executed with `this` as argument
		 * @returns `this`
		 */
		also(this: Number | null | undefined, block: (it: number) => void): number;
		/**
		 * Calls the specified function block with `this` value as its receiver and returns its value
		 * @param block - The function to be executed with `this` as context
		 * @returns `block`'s result
		 */
		run<R>(this: Number | null | undefined, block: (this: number) => R): R;
		/**
		 * Calls the specified function block with `this` value as its receiver and returns `this` value
		 * @param block - The function to be executed with `this` as context
		 * @returns `this`
		 */
		apply(
			this: Number | null | undefined,
			block: (this: number) => void,
		): number;
		/**
		 * Returns `this` value if it satisfies the given predicate or `undefined` if it doesn't
		 * @param predicate - The function to be executed with `this` as argument and returns a truthy or falsy value
		 * @returns `this` or `undefined`
		 */
		takeIf(
			this: Number | null | undefined,
			predicate: (it: number) => boolean,
		): number | undefined;
		/**
		 * Returns `this` value if it does not satisfy the given predicate or `undefined` if it does
		 * @param predicate - The function to be executed with `this` as argument and returns a truthy or falsy value
		 * @returns `this` or `undefined`
		 */
		takeUnless(
			this: Number | null | undefined,
			predicate: (it: number) => boolean,
		): number | undefined;
	}
	interface String {
		/**
		 * Calls the specified function block with `this` value as its argument and returns its result
		 * @param block - The function to be executed with `this` as argument
		 * @returns `block`'s result
		 */
		let<R>(this: String | null | undefined, block: (it: string) => R): R;
		/**
		 * Calls the specified function block with `this` value as its argument and returns `this` value
		 * @param block - The function to be executed with `this` as argument
		 * @returns `this`
		 */
		also(this: String | null | undefined, block: (it: string) => void): string;
		/**
		 * Calls the specified function block with `this` value as its receiver and returns its value
		 * @param block - The function to be executed with `this` as context
		 * @returns `block`'s result
		 */
		run<R>(this: String | null | undefined, block: (this: string) => R): R;
		/**
		 * Calls the specified function block with `this` value as its receiver and returns `this` value
		 * @param block - The function to be executed with `this` as context
		 * @returns `this`
		 */
		apply(
			this: String | null | undefined,
			block: (this: string) => void,
		): string;
		/**
		 * Returns `this` value if it satisfies the given predicate or `undefined` if it doesn't
		 * @param predicate - The function to be executed with `this` as argument and returns a truthy or falsy value
		 * @returns `this` or `undefined`
		 */
		takeIf(
			this: String | null | undefined,
			predicate: (it: string) => boolean,
		): string | undefined;
		/**
		 * Returns `this` value if it does not satisfy the given predicate or `undefined` if it does
		 * @param predicate - The function to be executed with `this` as argument and returns a truthy or falsy value
		 * @returns `this` or `undefined`
		 */
		takeUnless(
			this: String | null | undefined,
			predicate: (it: string) => boolean,
		): string | undefined;
	}
	interface Boolean {
		/**
		 * Calls the specified function block with `this` value as its argument and returns its result
		 * @param block - The function to be executed with `this` as argument
		 * @returns `block`'s result
		 */
		let<R>(this: Boolean | null | undefined, block: (it: boolean) => R): R;
		/**
		 * Calls the specified function block with `this` value as its argument and returns `this` value
		 * @param block - The function to be executed with `this` as argument
		 * @returns `this`
		 */
		also(
			this: Boolean | null | undefined,
			block: (it: boolean) => void,
		): boolean;
		/**
		 * Calls the specified function block with `this` value as its receiver and returns its value
		 * @param block - The function to be executed with `this` as context
		 * @returns `block`'s result
		 */
		run<R>(this: Boolean | null | undefined, block: (this: boolean) => R): R;
		/**
		 * Calls the specified function block with `this` value as its receiver and returns `this` value
		 * @param block - The function to be executed with `this` as context
		 * @returns `this`
		 */
		apply(
			this: Boolean | null | undefined,
			block: (this: boolean) => void,
		): boolean;
		/**
		 * Returns `this` value if it satisfies the given predicate or `undefined` if it doesn't
		 * @param predicate - The function to be executed with `this` as argument and returns a truthy or falsy value
		 * @returns `this` or `undefined`
		 */
		takeIf(
			this: Boolean | null | undefined,
			predicate?: (it: boolean) => boolean,
		): boolean | undefined;
		/**
		 * Returns `this` value if it does not satisfy the given predicate or `undefined` if it does
		 * @param predicate - The function to be executed with `this` as argument and returns a truthy or falsy value
		 * @returns `this` or `undefined`
		 */
		takeUnless(
			this: Boolean | null | undefined,
			predicate?: (it: boolean) => boolean,
		): boolean | undefined;
	}
}
