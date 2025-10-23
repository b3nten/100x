export function installScopeFunction() {
	Object.defineProperty(Object.prototype, "also", {
		value: function <T>(this: T, block: (it: T) => void): T {
			block(this);
			return this;
		},
		writable: true,
		enumerable: false,
		configurable: true,
	});

	Object.defineProperty(Object.prototype, "run", {
		value: function <T, R>(this: T, block: (this: T, self: T) => R): R {
			return block.call(this, this);
		},
		writable: true,
		enumerable: false,
		configurable: true,
	});

	Object.defineProperty(Object.prototype, "maybe", {
		value: function <T, R>(this: T, block: (this: T, self: T) => R): R {
			return block.call(this, this);
		},
		writable: true,
		enumerable: false,
		configurable: true,
	});
}
