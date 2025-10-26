export {
  type InferRouteHandler,
  routes,
  RouteDefinition,
  RouteInstance,
  RouteMatch,
  Router,
} from "./router.ts";
export { group } from "./group.js";
export {
  ClientRouter,
  type ClientRouterMiddleware,
  MetaRouteMiddleware,
} from "./client.ts";
export type { RoutesWithHandlerType } from "./types.ts";
export type { Params } from "./vendor/@remix-run/route-pattern@0.14.0/params.ts";
