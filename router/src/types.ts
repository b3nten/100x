import {type Join, type Params, RoutePattern} from "@remix-run/route-pattern";
import {Route} from "./mod.ts";

export interface RouteMap<T extends string = string> {
	[K: string]: Route<T> | RouteMap<T>
}

export type BuildRouteMap<P extends string = string, R extends RouteDefs = RouteDefs> = Simplify<{
	[K in keyof R]: (
		R[K] extends Route<infer S extends string> ? Route<Join<P, S>> :
			R[K] extends RouteDef ? BuildRoute<P, R[K]> :
				R[K] extends RouteDefs ? BuildRouteMap<P, R[K]> :
					never
		)
}>
// prettier-ignore
type BuildRoute<P extends string, D extends RouteDef> =
	D extends string ? Route<Join<P, D>> :
		D extends RoutePattern<infer S extends string> ? Route<Join<P, S>> :
			D extends { pattern: infer S } ? (
					S extends string ? Route<Join<P, S>> :
						S extends RoutePattern<infer S extends string> ? Route<Join<P, S>> :
							never
					) :
				never
type Simplify<T> = { [K in keyof T]: T[K] } & {}

export interface RouteDefs {
	[K: string]: Route | RouteDef | RouteDefs
}

export type RouteDef<T extends string = string> =
	| T
	| RoutePattern<T>
	| { pattern: T | RoutePattern<T> }

export type RouteHandler<T extends Route> = (ctx: {
	params: T extends Route<infer U> ? Params<U> : never
	url: URL
}) => any

export type RouteHandlerArgs<T extends Route> = T extends Route<infer U> ? {
	params: Params<U>
	url: URL
} : never

declare const routeHandlerType: unique symbol;

export type RouteHandlersMap<RM extends RouteMap> = Readonly<{
	[RMKey in keyof RM]?: (
		RM[RMKey] extends Route<infer U> ? RouteHandler<Params<U>> :
			RM[RMKey] extends RouteMap ? RouteHandlersMap<RM[RMKey]> :
				never
		)
}>

export type RoutesWithHandlerType<RM extends RouteMap<any>, Handlers extends RouteHandlersMap<RM>> = {
	[K in keyof RM]: Handlers[K] extends RouteHandler<any>
		? RM[K] & { [routeHandlerType]: ReturnType<Handlers[K]> }
		: RM[K] extends RouteMap
			? Handlers[K] extends RouteHandlersMap<RM[K]>
				? RoutesWithHandlerType<RM[K], Handlers[K]>
				: RM[K]
			: string
}

export type InferRouteHandler<T> =
	T extends { [routeHandlerType]: infer R } ? R : void