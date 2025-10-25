import {
  RouteDefinition,
  RouteMatch,
  Router,
  type RouteInstance,
} from "./router.ts";
import type { RouteHandlersMap } from "./types.ts";
import { action, observable, runInAction } from "mobx";
import { runCatching } from "@100x/engine/lib";
import { isRecord } from "@100x/engine/checks";

export interface ClientRouterMiddleware {
  /**
   * A list of routes that this middleware applies to.
   * If a function is provided, it will be called with the current path and should return true if the middleware applies to the path.
   * If an array of routes is provided, the middleware will only apply if the path matches any of the routes.
   * If undefined, the middleware will apply to all routes.
   */
  appliesTo?: Readonly<RouteInstance[] | ((path: string) => boolean)>;

  /**
   * Called before the router navigates to the given route.
   * If a promise is returned, the router will wait for the promise to resolve before navigating.
   * @param to - href of the route to navigate to
   */
  onBeforeNavigate?: (
    to: string,
    nextMatches: RouteMatch[],
  ) => void | Promise<void>;
  /**
   * Called after the router navigates to the given route.
   * @param from - href of the route that was navigated from
   */
  onAfterNavigate?: (from: string) => void;
  /**
   * Called when the router matches the given route.
   * @param matches
   */
  onMatches?: (matches: RouteMatch[]) => void;
}

export class ClientRouter<
  T extends RouteDefinition<any>,
  H extends RouteHandlersMap<T["definitions"]>[],
> extends Router<T, H> {
  @observable private accessor _searchParams = new URLSearchParams([]);

  public get searchParams() {
    return this._searchParams;
  }

  @observable private accessor _hash = "";

  public get hash() {
    return this._hash;
  }

  @observable
  private accessor _pathname = "";

  public get pathname() {
    return this._pathname;
  }

  @observable
  private accessor _href = "";

  get href() {
    return this._href;
  }

  @observable.shallow accessor matches: RouteMatch[] = [];

  constructor(config: {
    routes: T;
    handlers: H;
    middlewares?: ClientRouterMiddleware[];
    url?: URL;
  }) {
    super(config.routes, config.handlers);
    for (const event of [
      "popstate",
      "pushState",
      "replaceState",
      "hashchange",
    ]) {
      addEventListener(event, this.internalUpdate);
    }
    this._href = config.url?.href ?? window.location.href;
    this._pathname = config.url?.pathname ?? window.location.pathname;
    this._hash = config.url?.hash ?? window.location.hash;
    this._searchParams =
      config.url?.searchParams ?? new URLSearchParams(window.location.search);
    config.middlewares?.forEach((m) => {
      this.middlewares.add(m);
    });
    this.matches = this.match(this._href);
    this.middlewares.forEach((m) =>
      runCatching(() => {
        m.onMatches?.(this.matches);
      }),
    );
  }

  /**
   * Navigate to the given path. This will execute all routing middlewares and run the onMatches callback for each matching route.
   * If a promise is returned from any middleware, the navigation will wait for the promise to resolve before continuing.
   * If the path changes while the navigation is in progress, the navigation will be aborted.
   * @param path
   * @param args
   */
  @action
  async navigate(
    path: string,
    args: { replace?: boolean; state?: any } = { replace: false, state: null },
  ) {
    path = Router.createURL(path).href;
    if (this.nextPath) {
      if (path === this.nextPath) {
        return;
      }
    } else if (path === this.href) {
      return;
    }
    this.nextPath = path;
    const newMatches = this.match(path);
    const middleWarePromises = [];
    for (const m of this.middlewareIterator(this.href)) {
      const maybePromise = runCatching(() =>
        m.onBeforeNavigate?.(this.pathname, newMatches),
      );
      if (maybePromise instanceof Promise) {
        middleWarePromises.push(maybePromise);
      }
    }
    await Promise.allSettled(middleWarePromises); // todo: handle specific thrown rejections?
    if (this.nextPath === path) {
      runInAction(() => {
        this.navigateImpl(path, args, newMatches);
      });
    }
  }

  @action
  navigateImmediate(
    path: string,
    args: { replace?: boolean; state?: any } = { replace: false, state: null },
  ) {
    this.navigateImpl(path, args);
  }

  addMiddleware(middleware: ClientRouterMiddleware) {
    this.middlewares.add(middleware);
    return () => void this.middlewares.delete(middleware);
  }

  removeMiddleware(middleware: ClientRouterMiddleware) {
    this.middlewares.delete(middleware);
  }

  protected middlewares = new Set<ClientRouterMiddleware>();
  protected nextPath: string | null = null;

  protected navigateImpl(
    path: string,
    args: { replace?: boolean; state?: any } = { replace: false, state: null },
    matches?: Array<RouteMatch>,
  ) {
    this.matches = matches ?? this.match(path);
    for (const m of this.middlewareIterator(path)) {
      runCatching(() => {
        m.onMatches?.(this.matches);
      });
    }
    history[args.replace ? "replaceState" : "pushState"](
      args.state,
      "",
      Router.createURL(path).href,
    );
    this.internalUpdate();
    for (const m of this.middlewareIterator(path)) {
      runCatching(() => {
        m.onAfterNavigate?.(path);
      });
    }
    this.nextPath = null;
  }

  protected *middlewareIterator(path: string) {
    for (const m of this.middlewares) {
      if (
        !m.appliesTo ||
        (typeof m.appliesTo === "function" && m.appliesTo(path)) ||
        (Array.isArray(m.appliesTo) && m.appliesTo.some((r) => r.match(path)))
      ) {
        yield m;
      }
    }
  }

  protected internalUpdate() {
    this._searchParams = new URLSearchParams(window.location.search);
    this._hash = window.location.hash;
    this._pathname = window.location.pathname;
    this._href = window.location.href;
  }
}

export class MetaRouteMiddleware implements ClientRouterMiddleware {
  onMatches(matches: RouteMatch[]) {
    for (const meta of this.matchIter(matches)) {
      if ("title" in meta && typeof meta.title === "string") {
        document.title = meta.title;
      }
    }
  }
  private *matchIter(matches: RouteMatch[]): IterableIterator<object> {
    for (const match of matches) {
      if (
        isRecord(match.data) &&
        "meta" in match.data &&
        isRecord(match.data.meta)
      ) {
        yield match.data.meta;
      }
    }
  }
}

{
  // patch history.pushState and history.replaceState to emit an event when they are called
  const patchKey = Symbol.for("im the goat");
  if (
    typeof history !== "undefined" &&
    // @ts-expect-error
    typeof window[patchKey] === "undefined"
  ) {
    for (const type of ["pushState", "replaceState"] as const) {
      const original = history[type];
      history[type] = function () {
        // @ts-expect-error argument usage is kind of wild, but ok Wouter
        const result = original.apply(this, arguments);
        const event = new Event(type);
        // @ts-expect-error argument usage is kind of wild, but ok Wouter
        event.arguments = arguments;
        dispatchEvent(event);
        return result;
      };
    }
    Object.defineProperty(window, patchKey, { value: true });
  }
}
