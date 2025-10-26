import { createRoutes } from "./createRoutes.ts";
import type { RouteInstance } from "./router.ts";
import type { BuildRouteMap, RouteDefs } from "./types.ts";
import { RoutePattern } from "./vendor/@remix-run/route-pattern@0.14.0/route-pattern.ts";

export function group<P extends string, const R extends RouteDefs>(
  base: P,
  defs: R,
): {
  root: RouteInstance<`${P}*`>;
} & BuildRouteMap<P, R> {
  return {
    root: new RoutePattern(base + "*"),
    ...createRoutes(base, defs),
  } as any;
}
