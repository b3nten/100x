import {
  RouteDefinition,
  RouteMatch,
  Router,
  type RouteInstance,
} from "./router.ts";
import type { RouteHandlersMap } from "./types.ts";
import { runCatching } from "@100x/engine/lib";
import { isRecord } from "@100x/engine/checks";
import { createEvent, EventManager } from "@100x/engine/events";

export interface ClientRouterMiddleware {
  /**
   * A list of routes that this middleware applies to.
   * If a function is provided, it will be called with the current path and should return true if the middleware applies to the path.
   * If an array of routes is provided, the middleware will only apply if the path matches any of the routes.
   * If undefined, the middleware will apply to all routes.
   */
  appliesTo?: Readonly<RouteInstance[] | ((url: URL) => boolean)>;

  /**
   * Called before the router navigates to the given route.
   * If a promise is returned, the router will wait for the promise to resolve before navigating.
   * @param to - href of the route to navigate to
   */
  onBeforeNavigate?: (
    from: URL,
    to: URL,
    nextMatches: RouteMatch[],
  ) => void | Promise<void>;
  /**
   * Called after the router navigates to the given route.
   * @param from - href of the route that was navigated from
   */
  onAfterNavigate?: (from: URL, to: URL) => void;
  /**
   * Called when the router matches the given route.
   * @param matches
   */
  onMatches?: (matches: RouteMatch[]) => void;
}

export const beforeNavigateEvent = createEvent<{
  from: URL;
  to: URL;
  nextMatches: RouteMatch[];
}>("ClientRouter::BeforeNavigate");

export const receivedMatchesEvent = createEvent<{
  matches: RouteMatch[];
}>("ClientRouter::ReceivedMatches");

export const afterNavigateEvent = createEvent<{
  from: URL;
  to: URL;
}>("ClientRouter::AfterNavigate");

export const navigationEvent = createEvent<{
  from: URL;
  to: URL;
  matches: RouteMatch[];
}>("ClientRouter::Navigation");

export class ClientRouter<
  T extends RouteDefinition<any>,
  H extends RouteHandlersMap<T["definitions"]>[],
> extends Router<T, H> {
  #url: URL;
  get url() {
    return this.#url;
  }

  public get searchParams() {
    return this.#url.searchParams;
  }

  public get hash() {
    return this.#url.hash;
  }

  public get pathname() {
    return this.#url.pathname;
  }

  get href() {
    return this.#url.href;
  }

  #matches: RouteMatch[] = [];
  get matches() {
    return this.#matches;
  }

  #previousUrl: URL;
  get previousUrl() {
    return this.#previousUrl;
  }

  #events = new EventManager();
  register = this.#events.register;
  unregister = this.#events.unregister;

  #middlewares = new Set<ClientRouterMiddleware>();
  #nextPath: string | null = null;

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
      addEventListener(event, this.#update);
    }

    this.#previousUrl = this.#url =
      config.url ?? Router.createURL(window.location.href);

    config.middlewares?.forEach((m) => this.#middlewares.add(m));

    this.#matches = this.match(this.url);

    this.#middlewares.forEach((m) => {
      runCatching(() => {
        m.onMatches?.(this.#matches);
      });
    });

    this.#events.notify(receivedMatchesEvent, { matches: this.#matches });
  }

  /**
   * Navigate to the given path. This will execute all routing middlewares and run the onMatches callback for each matching route.
   * If a promise is returned from any middleware, the navigation will wait for the promise to resolve before continuing.
   * If the path changes while the navigation is in progress, the navigation will be aborted.
   * @param to
   * @param args
   */
  navigate = async (
    to: string | URL,
    args: { replace?: boolean; state?: any } = { replace: false, state: null },
  ) => {
    to = Router.createURL(to);
    // return if path is the same as current path or next path
    if (
      (this.#nextPath && to.href === this.#nextPath) ||
      to.href === this.href
    ) {
      return;
    }

    this.#nextPath = to.href;

    const newMatches = this.match(to);
    const middleWarePromises = [];
    for (const m of this.#middlewareIterator(this.url)) {
      const maybePromise = runCatching(() =>
        m.onBeforeNavigate?.(this.url, to, newMatches),
      );
      if (maybePromise instanceof Promise) {
        middleWarePromises.push(maybePromise);
      }
    }

    this.#events.notify(beforeNavigateEvent, {
      nextMatches: newMatches,
      from: this.url,
      to: Router.createURL(to),
    });

    // max wait time
    await Promise.race([
      Promise.allSettled(middleWarePromises),
      new Promise((_, reject) => setTimeout(reject, 2000)),
    ]);

    if (this.#nextPath === to.href) {
      this.#navigate(to, args, newMatches);
    }
  };

  navigateImmediate = (
    path: string | URL,
    args: { replace?: boolean; state?: any } = { replace: false, state: null },
  ) => {
    this.#navigate(path, args);
  };

  addMiddleware = (middleware: ClientRouterMiddleware) => {
    this.#middlewares.add(middleware);
    return () => void this.#middlewares.delete(middleware);
  };

  removeMiddleware = (middleware: ClientRouterMiddleware) =>
    this.#middlewares.delete(middleware);

  #navigate(
    to: string | URL,
    args: { replace?: boolean; state?: any } = { replace: false, state: null },
    matches?: Array<RouteMatch>,
  ) {
    to = Router.createURL(to);
    this.#matches = matches ?? this.match(to);
    for (const m of this.#middlewareIterator(to)) {
      runCatching(() => {
        m.onMatches?.(this.#matches);
      });
    }
    this.#events.notify(receivedMatchesEvent, { matches: this.#matches });

    this.#previousUrl = this.url;

    history[args.replace ? "replaceState" : "pushState"](
      args.state,
      "",
      to.href,
    );

    for (const m of this.#middlewareIterator(to)) {
      runCatching(() => {
        m.onAfterNavigate?.(this.previousUrl, to);
      });
    }

    this.#events.notify(afterNavigateEvent, {
      from: this.#previousUrl,
      to: to,
    });

    this.#nextPath = null;
  }

  #update = () => {
    this.#url = Router.createURL(window.location.href);
    this.#events.notify(navigationEvent, {
      from: this.#previousUrl,
      to: this.#url,
      matches: this.#matches,
    });
  };

  *#middlewareIterator(url: URL) {
    for (const m of this.#middlewares) {
      if (
        !m.appliesTo ||
        (typeof m.appliesTo === "function" && m.appliesTo(url)) ||
        (Array.isArray(m.appliesTo) && m.appliesTo.some((r) => r.match(url)))
      ) {
        yield m;
      }
    }
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
      for (const data of match.data) {
        if (isRecord(data) && "meta" in data && isRecord(data.meta)) {
          yield data.meta;
        }
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
