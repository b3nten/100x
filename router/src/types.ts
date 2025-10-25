import {
  type Join,
  type Params,
  RoutePattern,
} from "../vendor/@remix-run/route-pattern@0.14.0";
import { RouteInstance } from "./router.ts";

export interface RouteMap<T extends string = string> {
  [K: string]: RouteInstance<T> | RouteMap<T>;
}

export type BuildRouteMap<
  P extends string = string,
  R extends RouteDefs = RouteDefs,
> = Simplify<{
  [K in keyof R]: R[K] extends RouteInstance<infer S extends string>
    ? RouteInstance<Join<P, S>>
    : R[K] extends RouteDef
      ? BuildRoute<P, R[K]>
      : R[K] extends RouteDefs
        ? BuildRouteMap<P, R[K]>
        : never;
}>;

export type BuildRouteMapWithGroup<
  P extends string = string,
  R extends RouteDefs = RouteDefs,
> = Simplify<{
  [K in keyof R]: R[K] extends RouteInstance<infer S extends string>
    ? RouteInstance<Join<P, S>>
    : R[K] extends RouteDef
      ? BuildRoute<P, R[K]>
      : R[K] extends RouteDefs
        ? BuildRouteMap<P, R[K]>
        : never;
}>;

// prettier-ignore
type BuildRoute<P extends string, D extends RouteDef> =
	D extends string ? RouteInstance<Join<P, D>> :
		D extends RoutePattern<infer S extends string> ? RouteInstance<Join<P, S>> :
			D extends { pattern: infer S } ? (
					S extends string ? RouteInstance<Join<P, S>> :
						S extends RoutePattern<infer S extends string> ? RouteInstance<Join<P, S>> :
							never
					) :
				never

type Simplify<T> = { [K in keyof T]: T[K] } & {};

export interface RouteDefs {
  [K: string]: RouteInstance | RouteDef | RouteDefs;
}

export type RouteDef<T extends string = string> =
  | T
  | RoutePattern<T>
  | { pattern: T | RoutePattern<T> };

export type RouteHandler<T extends RouteInstance> = (
  url: URL,
  params: T extends RouteInstance<infer U> ? Params<U> : never,
) => unknown;

export type RouteHandlerArgs<T extends RouteInstance> =
  T extends RouteInstance<infer U>
    ? {
        params: U;
        url: URL;
      }
    : never;

declare const routeHandlerType: unique symbol;

export type RouteHandlersMap<RM extends RouteMap> = Readonly<{
  [RMKey in keyof RM]?: RM[RMKey] extends RouteInstance<infer U>
    ? RouteHandler<Params<U>>
    : RM[RMKey] extends RouteMap
      ? RouteHandlersMap<RM[RMKey]>
      : never;
}>;

export type RoutesWithHandlerType<
  RM extends RouteMap<any>,
  Handlers extends {
    [P in keyof RM]?: ((...args: any) => any) | RouteHandlersMap<RM[P]>;
  },
> = {
  [K in keyof RM]: Handlers[K] extends RouteHandler<any>
    ? RM[K] & { [routeHandlerType]: ReturnType<Handlers[K]> }
    : RM[K] extends RouteMap
      ? Handlers[K] extends RouteHandlersMap<RM[K]>
        ? RoutesWithHandlerType<RM[K], Handlers[K]>
        : RM[K]
      : never;
};

export type InferRouteHandler<T> = T extends { [routeHandlerType]: infer R }
  ? R extends Array<any>
    ? R
    : [R]
  : void;

type DeepMerge<A, B> = A extends (...args: any[]) => infer AR
  ? B extends (...args: any[]) => infer BR
    ? () => DeepMerge<AR, BR>
    : A
  : B extends (...args: any[]) => any
    ? B
    : A extends object
      ? B extends object
        ? {
            [K in keyof (A & B)]: K extends keyof A
              ? K extends keyof B
                ? DeepMerge<A[K], B[K]>
                : A[K]
              : K extends keyof B
                ? B[K]
                : never;
          }
        : A
      : B;

export type DeepMergeAll<T extends any[]> = T extends [infer Only]
  ? Only
  : T extends [infer A, infer B, ...infer Rest]
    ? DeepMergeAll<[DeepMerge<A, B>, ...Rest]>
    : unknown;

type ToArray<T> = T extends readonly any[] ? T : [T];

type MergeHandlerFunctions<
  A extends (...args: any) => any,
  B extends (...args: any) => any,
> = (
  ...args: Parameters<A>
) => [...ToArray<ReturnType<A>>, ...ToArray<ReturnType<B>>];

type MergeObjects<A, B> = {
  [K in keyof A | keyof B]: K extends keyof A
    ? K extends keyof B
      ? A[K] extends (...args: any) => any
        ? B[K] extends (...args: any) => any
          ? MergeHandlerFunctions<A[K], B[K]> // both functions
          : (...args: Parameters<A[K]>) => ToArray<ReturnType<A[K]>>
        : A[K] extends object
          ? B[K] extends object
            ? MergeObjects<A[K], B[K]>
            : A[K]
          : A[K]
      : A[K]
    : K extends keyof B
      ? B[K] extends (...args: any) => any
        ? (...args: Parameters<B[K]>) => ToArray<ReturnType<B[K]>>
        : B[K]
      : never;
};

export type MergeHandlers<A, B> = MergeObjects<A, B>;

export type MergeAllHandlers<H extends any[]> = H extends [
  infer First,
  ...infer Rest,
]
  ? Rest extends any[]
    ? MergeHandlers<First, MergeAllHandlers<Rest>>
    : First
  : {};
