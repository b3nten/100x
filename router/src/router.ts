import type {
  RoutesWithHandlerType,
  BuildRouteMap,
  RouteDefs,
  RouteHandler,
  RouteHandlersMap,
  RouteMap,
  MergeAllHandlers,
} from "./types.ts";
import { createRoutes } from "./createRoutes.ts";
import { RoutePattern } from "./vendor/@remix-run/route-pattern@0.14.0/route-pattern.ts";
import type { HrefBuilderArgs } from "./vendor/@remix-run/route-pattern@0.14.0/href.ts";
import type { Params } from "./vendor/@remix-run/route-pattern@0.14.0/params.ts";
import { RegExpMatcher } from "./vendor/@remix-run/route-pattern@0.14.0/regexp-matcher.ts";

export type { InferRouteHandler } from "./types.ts";

export class RouteInstance<P extends string = string> {
  readonly pattern: RoutePattern<P>;
  readonly id: string;

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
}

export class RouteDefinition<const R extends RouteDefs> {
  definitions: BuildRouteMap<"/", R>;

  constructor(defs: R) {
    this.definitions = createRoutes("/", defs);
  }

  createHandlers<
    Handlers extends Readonly<RouteHandlersMap<(typeof this)["definitions"]>>,
  >(handlers: Handlers) {
    return handlers;
  }
}

export const routes = createRoutes;

export class RouteMatch {
  get data(): unknown[] {
    if (!this.#hasRunHandlers) {
      this.runHandlers();
    }
    return this.#handlersResult!;
  }

  runHandlers() {
    this.#handlersResult = this.handlers.map((handler) =>
      handler(this.url, this.params),
    );
    this.#hasRunHandlers = true;
    return this.#handlersResult;
  }

  constructor(
    public readonly url: URL,
    public readonly route: RouteInstance,
    public readonly handlers: Array<RouteHandler<any>>,
    public readonly params: Params<any>,
  ) {}

  #hasRunHandlers = false;

  #handlersResult?: unknown[];
}

export class Router<
  T extends RouteDefinition<any>,
  H extends RouteHandlersMap<T["definitions"]>[],
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

  readonly routes: RoutesWithHandlerType<T["definitions"], MergeAllHandlers<H>>;
  readonly handlers: H;

  constructor(routes: T, handlers: H) {
    this.routes = routes.definitions as any;
    this.handlers = handlers;
    this.map(routes.definitions, handlers);
  }

  public match(path: string | URL) {
    path = Router.createURL(path);
    const data: Array<RouteMatch> = [];
    for (let match of this.matcher.matchAll(path)) {
      data.push(
        new RouteMatch(
          match.url,
          match.data.route,
          match.data.handlers,
          match.params,
        ),
      );
    }
    return data;
  }

  private map(route: RouteInstance<any>, handlers?: Function[]): void;
  private map(route: RouteMap<any>, handlers: RouteHandlersMap<any>[]): void;
  private map(routeDefinitionOrRouteMap: any, handlers: any[]): void {
    if (routeDefinitionOrRouteMap instanceof RouteInstance) {
      if (!handlers.length) return;
      this.matcher.add(routeDefinitionOrRouteMap.pattern, {
        route: routeDefinitionOrRouteMap,
        handlers,
      });
    } else {
      for (let key in routeDefinitionOrRouteMap) {
        const newHandlers: any[] = [];
        for (let handler of handlers) {
          if (handler[key]) {
            newHandlers.push(handler[key]);
          }
        }
        this.map(routeDefinitionOrRouteMap[key], newHandlers);
      }
    }
  }

  private matcher = new RegExpMatcher();
}
