/**
 * Autobind decorator for class methods.
 * @param value
 * @param name
 * @param addInitializer
 */
export function autobind<T>(
	value: T,
	{ name, addInitializer }: ClassMethodDecoratorContext,
) {
	addInitializer(function () {
		// @ts-expect-error
		this[name] = this[name].bind(this);
	});
}
