import type { BuildRouteMap, RouteDefs, RouteMap } from "./types.ts";
import { RouteInstance } from "./router.ts";
import { RoutePattern } from "./vendor/@remix-run/route-pattern@0.14.0/route-pattern.ts";

function buildRouteMap<P extends string, R extends RouteDefs>(
  base: RoutePattern<P>,
  defs: R,
  pathBase: string = "",
): BuildRouteMap<P, R> {
  let routes: any = {};
  for (let key in defs) {
    let def = defs[key] as RouteInstance | string | RoutePattern | RouteDefs;
    if (def instanceof RouteInstance) {
      routes[key] = new RouteInstance(
        base.join(def.pattern),
        `${pathBase}${key}`,
      );
    } else if (typeof def === "string" || def instanceof RoutePattern) {
      routes[key] = new RouteInstance(base.join(def), `${pathBase}${key}`);
    } else if (typeof def === "object" && def != null && "pattern" in def) {
      routes[key] = new RouteInstance(
        base.join((def as any).pattern),
        `${pathBase}${key}`,
      );
    } else {
      routes[key] = buildRouteMap(
        base,
        def as any,
        `${pathBase === "" ? "" : pathBase + "."}${key}.`,
      );
    }
  }
  return routes;
}

export function createRoutes<const R extends RouteDefs>(
  defs: R,
): BuildRouteMap<"/", R>;
export function createRoutes<P extends string, const R extends RouteDefs>(
  base: P | RoutePattern<P>,
  defs: R,
): BuildRouteMap<P, R>;
export function createRoutes(baseOrDefs: any, defs?: RouteDefs): RouteMap {
  return typeof baseOrDefs === "string" || baseOrDefs instanceof RoutePattern
    ? buildRouteMap(
        typeof baseOrDefs === "string"
          ? new RoutePattern(baseOrDefs)
          : baseOrDefs,
        defs!,
      )
    : buildRouteMap(new RoutePattern("/"), baseOrDefs);
}
