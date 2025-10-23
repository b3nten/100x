import {
  type HrefBuilderArgs,
  type Params,
  RegExpMatcher,
  RoutePattern,
} from "@remix-run/route-pattern";
import type {
  RoutesWithHandlerType,
  BuildRouteMap,
  RouteDefs,
  RouteHandler,
  RouteHandlersMap,
  RouteMap,
} from "./types.ts";
import { createRoutes } from "./createRoutes.ts";

export type { InferRouteHandler } from "./types.ts";

export class RouteDefinition<P extends string = string> {
  readonly pattern: RoutePattern<P>;

  constructor(pattern: P | RoutePattern<P>, id: string) {
    this.pattern =
      typeof pattern === "string" ? new RoutePattern(pattern) : pattern;
    this.id = id;
  }

  href(...args: HrefBuilderArgs<P>) {
    return this.pattern.href(...args);
  }

  match(url: string | URL) {
    return this.pattern.match(url);
  }

  readonly id: string;
}

export class Routes<P extends string, const R extends RouteDefs> {
  definitions: BuildRouteMap<P, R>;

  constructor(base: P | RoutePattern<P>, defs: R) {
    this.definitions = createRoutes(base, defs);
  }

  createHandlers<
    Handlers = Readonly<RouteHandlersMap<(typeof this)["definitions"]>>,
  >(handlers: Handlers) {
    return handlers;
  }

  withHandlerTypes<
    Handlers extends RouteHandlersMap<(typeof this)["definitions"]>,
  >(): Handlers extends RouteHandlersMap<(typeof this)["definitions"]>
    ? RoutesWithHandlerType<(typeof this)["definitions"], Handlers>
    : never {
    return this.definitions as any;
  }
}

export const routes = createRoutes;

export function group<P extends string, const R extends RouteDefs>(
  base: P,
  defs: R,
) {
  return {
    group: base + "*",
    ...createRoutes(base, defs),
  } as Readonly<{ group: `${P}*` }> & BuildRouteMap<P, R>;
}

export class RouteMatch<P extends string, T> {
  readonly url: URL;
  readonly params: Params<P>;
  readonly route: RouteDefinition<P>;
  readonly handlerFunction?: RouteHandler<T>;
  readonly handler: () => unknown;

  constructor(args: {
    url: URL;
    params: Params<P>;
    route: RouteDefinition<P>;
    handler: RouteHandler<T>;
  }) {
    this.url = args.url;
    this.params = args.params;
    this.route = args.route;
    this.handlerFunction = args.handler;
    this.handler = () => {
      return this.handlerFunction?.({
        url: this.url,
        params: this.params,
      });
    };
  }
}

export class Router<
  T extends BuildRouteMap | RoutesWithHandlerType<any, any>,
  H extends RouteHandlersMap<T>,
> {
  static createURL = (path: string | URL): URL =>
    path instanceof URL
      ? path
      : URL.canParse(path)
        ? new URL(path)
        : new URL(
            path,
            typeof location !== "undefined"
              ? location.origin
              : "http://0.0.0.0",
          );

  routes: T;
  handlers: H;

  constructor(routes: T, handlers: H) {
    this.routes = routes;
    this.handlers = handlers;
    this.map(routes, handlers);
  }

  public match(path: string | URL) {
    path = Router.createURL(path);
    const data: Array<RouteMatch<any, any>> = [];
    for (let match of this.matcher.matchAll(path)) {
      data.push(
        new RouteMatch({
          url: match.url,
          params: match.params,
          route: match.data.route,
          handler: match.data.handler,
        }),
      );
    }
    return data;
  }

  private map<P extends string>(
    route: P | RoutePattern<P> | RouteDefinition<P>,
    handler: any,
  ): void;
  private map<T extends RouteMap>(
    routes: T,
    handlers: RouteHandlersMap<T>,
  ): void;
  private map(routeOrRoutes: any, handler: any): void {
    if (routeOrRoutes instanceof RouteDefinition) {
      this.matcher.add(routeOrRoutes.pattern, {
        handler,
        route: routeOrRoutes,
      });
    } else if (handler) {
      let handlers = handler;
      for (let key in routeOrRoutes) {
        let route = routeOrRoutes[key];
        let handler = handlers[key];
        if (route instanceof RouteDefinition) {
          this.matcher.add(route.pattern, {
            handler,
            route,
          });
        } else {
          this.map(route, handler);
        }
      }
    }
  }

  private matcher = new RegExpMatcher();
}
