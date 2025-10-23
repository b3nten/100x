import {observer} from "mobx-react-lite";
import {
    createContext,
    createElement,
    type ReactElement,
    type ReactNode,
    Suspense,
    use,
    useEffect,
    useState
} from "react";
import {Route as RouteImpl, type InferRouteHandler} from "@100x/router";
import {useRouter} from "./router.ts";
import {nonNullOrThrow} from "@100x/engine/asserts";

export const routeContext = createContext<RouteImpl | null>(null)

export const useRoute = <T extends RouteImpl>(): T =>
    nonNullOrThrow(
        use(routeContext) as T,
        "useRoute must be used within a Route",
    )

export const Route = observer(
	function<T extends RouteImpl>({
		match: route,
		children,
	}: {
		match: T;
		children: ReactNode | ReactNode[] | ((
			data: InferRouteHandler<T>
		) => ReactNode | ReactNode[] | null);
	}) {
		const router = useRouter()
        return createElement(
            routeContext.Provider,
            { value: route },
            route.match(router.href) ?
                typeof children === "function" ?
                    (children(
                        router.matches.find(m => m.route === route)?.data as any
                    )) :
                    children :
                null
        )
	}
);

declare global {
    var __lazyComponentImports: Map<string, () => Promise<{ default: (props: any) => ReactElement }>>
    var __lazyComponentPromises: Map<string, Promise<{ default: (props: any) => ReactElement }>>
}

export const LazyRoute = observer(
    function <
        R extends RouteImpl,
        C extends () => Promise<{ default: (props: any) => ReactElement }>
    >(props: {
        match: R,
        import: C,
        children: (
            Component: Awaited<ReturnType<C>>["default"],
            data: InferRouteHandler<R>
        ) => ReactNode
    }) {
        const importPath = props.import as unknown as string;
        const router = useRouter()
        // promise to preload the component
        const [preloadPromise, setPreloadPromise] = useState<Promise<any> | null>(null)

        useEffect(() =>
                router.addMiddleware({
                    onBeforeNavigate(_, nextMatches) {
                        if (nextMatches.some(m => m.route === props.match)) {
                            setPreloadPromise(getComponentPromise(importPath))
                        }
                    }
                })
            , [props.match, router]);

        if (props.match.match(router.href)) {
            const mod = use(getComponentPromise(importPath))
            return createElement(
                Route,
                {
                    match: props.match,
                    children: (data) => props.children(mod.default, data)
                },
            )
        }

        // use this promise in a suspense boundary to trigger caching
        if (preloadPromise) {
            return createElement(
                Suspense,
                null,
                createElement(Use, { promise: preloadPromise })
            )
        }

        return null
    })

function Use(props: { promise: Promise<any> }) {
    use(props.promise)
    return null
}

function getComponentPromise(importPath: string) {
    let promise = globalThis.__lazyComponentPromises.get(importPath)
    if (!promise) {
        globalThis.__lazyComponentPromises.set(
            importPath,
            promise = globalThis.__lazyComponentImports.get(importPath)!()
        )
    }
    return promise
}

export function useRouteTransition(transitionFunction: () => Promise<any>) {
    const router = useRouter()
    const route = useRoute()
    useEffect(() => router.addMiddleware({
        appliesTo: [route],
        onBeforeNavigate: transitionFunction,
    }), [transitionFunction, router, route]);
}
