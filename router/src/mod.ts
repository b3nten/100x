export {
  type InferRouteHandler,
  routes,
  group,
  RouteDefinition as Routes,
  RouteInstance as RouteDefinition,
  RouteMatch,
  Router,
} from "./router";
export {
  ClientRouter,
  type ClientRouterMiddleware,
  MetaRouteMiddleware,
  type RouteData,
} from "./client";
export type { RoutesWithHandlerType } from "./types";
