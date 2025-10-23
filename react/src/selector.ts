import {useRef} from "react";

/**
 * A React hook that provides a proxy for managing selectors of HTML elements.
 * @example
 * const { parent, child } = useSelectors();
 * useEffect(() => { console.log(parent.orNull, child.orUndefined, child.notNull) });
 * return (<div ref={parent}><span ref={child}>Hello</span></div>);
 */
export function useSelectors<T extends HTMLElement>() {
    const map = useRef(new Map<PropertyKey, T>());
    const proxy = useRef(new Proxy(map.current, useSelectorProxyHandler));
    return proxy.current as unknown as SelectorProxy<T>;
}

const useSelectorProxyHandler: ProxyHandler<Map<PropertyKey, any>> = {
    get(target, name) {
        if (name === Symbol.iterator) {
            return target.values.bind(target);
        }
        function handler(thing?: unknown) {
            if (thing === null) {
                target.delete(name);
            } else {
                target.set(name, thing);
            }
        }
        const proxy = new Proxy(handler, {
            get(_, prop) {
                if (prop === "orNull") {
                    return () => target.get(name) ?? null;
                }
                if (prop === "orUndefined") {
                    return () => target.get(name);
                }
                if (prop === "notNull") {
                    return () => target.get(name) ?? null;
                }
                return Reflect.get(handler, prop);
            },
            apply(
                target: (thing?: unknown) => void,
                thisArg: any,
                argArray: any[],
            ): any {
                return Reflect.apply(target, thisArg, argArray);
            },
        });
        return proxy;
    },
};

type SelectorProxy<T> = {
    [Symbol.iterator]: Map<string, T>["values"];
} & Record<
    string,
    {
        (element: T | null): VoidFunction;
        orNull: T | null;
        orUndefined: T | undefined;
        notNull: T;
    }
>;
