import {
  createContext,
  createElement,
  type ReactElement,
  type ReactNode,
  Suspense,
  use,
  useEffect,
  useState,
} from "react";
import { RouteInstance, type InferRouteHandler } from "@100x/router";
import { useRouter } from "./router.ts";
import { nonNullOrThrow } from "@100x/engine/asserts";
import type { Params } from "@100x/router";

export const routeContext = createContext<RouteInstance | null>(null);

export const useRoute = <T extends RouteInstance>(): T =>
  nonNullOrThrow(
    use(routeContext) as T,
    "useRoute must be used within a Route",
  );

export function Route<T extends RouteInstance>({
  match: route,
  children,
  params,
}: {
  match: T;
  children:
    | ReactNode
    | ReactNode[]
    | ((
        data: InferRouteHandler<T>,
        params: T extends RouteInstance<infer U> ? Params<U> : never,
      ) => ReactNode | ReactNode[] | null);
  params?: T extends RouteInstance<infer U> ? Params<U> : never;
}) {
  const { router, href, pathname } = useRouter();

  const doesMatch = params
    ? route.match(href) && pathname === route.href(params)
    : route.match(href);
  if (!doesMatch) return null;

  return createElement(
    routeContext.Provider,
    { value: route },
    typeof children === "function"
      ? children(
          router.matches.find((m) => m.route === route)
            ?.data as InferRouteHandler<T>,
          // @ts-ignore
          route.match(href)?.params ?? {},
        )
      : children,
  );
}

declare global {
  var __lazyComponentImports: Map<
    string,
    () => Promise<{ default: (props: any) => ReactElement }>
  >;
  var __lazyComponentPromises: Map<
    string,
    Promise<{ default: (props: any) => ReactElement }>
  >;
}

export function LazyRoute<
  R extends RouteInstance,
  C extends () => Promise<{ default: (props: any) => ReactElement }>,
>(props: {
  match: R;
  import: C;
  children: (
    Component: Awaited<ReturnType<C>>["default"],
    data: InferRouteHandler<R>,
    params: R extends RouteInstance<infer U> ? Params<U> : never,
  ) => ReactNode;
}) {
  const importPath = props.import as unknown as string;
  const { router } = useRouter();
  // promise to preload the component
  const [preloadPromise, setPreloadPromise] = useState<Promise<any> | null>(
    null,
  );

  useEffect(
    () =>
      router.addMiddleware({
        onBeforeNavigate(_, __, nextMatches) {
          if (nextMatches.some((m) => m.route === props.match)) {
            setPreloadPromise(getComponentPromise(importPath));
          }
        },
      }),
    [props.match, router],
  );

  const doesMatch = props.match.match(router.href);

  if (doesMatch) {
    const mod = use(getComponentPromise(importPath));
    return createElement(Route, {
      match: props.match,
      children: (data, params) =>
        props.children(
          mod.default,
          data as InferRouteHandler<R>,
          params as any,
        ),
    });
  }

  // use this promise in a suspense boundary to trigger caching
  if (preloadPromise) {
    return createElement(
      Suspense,
      null,
      createElement(Use, { promise: preloadPromise }),
    );
  }

  return null;
}

function Use(props: { promise: Promise<any> }) {
  use(props.promise);
  return null;
}

function getComponentPromise(importPath: string) {
  let promise = globalThis.__lazyComponentPromises.get(importPath);
  if (!promise) {
    globalThis.__lazyComponentPromises.set(
      importPath,
      (promise = globalThis.__lazyComponentImports.get(importPath)!()),
    );
  }
  return promise;
}

export function useRouteTransition(transitionFunction: () => Promise<any>) {
  const r = useRouter();
  const route = useRoute();
  useEffect(
    () =>
      r.router.addMiddleware({
        appliesTo: [route],
        onBeforeNavigate: transitionFunction,
      }),
    [transitionFunction, r.router, route],
  );
}
