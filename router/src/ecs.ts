import { System } from "@100x/engine/ecs";
import {
  ClientRouter,
  afterNavigateEvent,
  beforeNavigateEvent,
  navigationEvent,
  receivedMatchesEvent,
} from "./client";
import { noop, runCatching } from "@100x/engine/lib";
import { createEvent } from "@100x/engine/events";
import type { InferRouteHandler, RouteInstance, RouteMatch } from "./router";
import { assert } from "@100x/engine/asserts";
import type { Params } from "./mod";

export const navigateEvent = createEvent<{
  to: string | URL;
}>("ClientRouter::Navigate");

export class ClientRoutingSystem extends System {
  #router: ClientRouter<any, any>;
  constructor(router: ClientRouter<any, any>) {
    super();
    this.#router = router;

    // pass through router events to world systems
    this.whenStarted(() => {
      const cleanup: VoidFunction[] = [];
      for (const event of [
        afterNavigateEvent,
        beforeNavigateEvent,
        navigationEvent,
        receivedMatchesEvent,
      ]) {
        cleanup.push(
          this.#router.register(event, (payload) =>
            this.sendEvent(event, payload),
          ),
        );
      }
      return () => cleanup.forEach(runCatching);
    });

    // add client router to world
    this.whenStarted(() => {
      const entity = this.world.createEntityWith(this.#router);
      return () => this.world.removeEntity(entity);
    });

    // respond to navigationEvents
    this.whenStarted(() =>
      this.world.receiveEvent(navigateEvent, (payload) =>
        this.#router.navigate(payload.to),
      ),
    );
  }
}

/**
 * Decorator for binding a method in a system to an event to automatically subscribe.
 * @param event - EventType to handle
 * @returns
 */
export function routeHandler<T extends RouteInstance>(
  route: T,
  options: { preNavigation?: boolean; runOnStart?: boolean } = {},
) {
  return function <
    This extends System,
    M extends (args: {
      data: InferRouteHandler<T>;
      params: T extends RouteInstance<infer U> ? Params<U> : never;
      url: URL;
    }) => void,
  >(method: M, { addInitializer }: ClassMethodDecoratorContext<This, M>) {
    addInitializer(function (this: This) {
      this.whenStarted(() => {
        if (options.runOnStart !== false) {
          const startup = () => {
            const router = this.world.resolveComponent(ClientRouter);
            assert(!!router, "ClientRouter component not found");
            const match = router.matches.find((m) => m.route === route);
            const currentMatch = route.match(router.href);
            if (currentMatch) {
              method.call(this, {
                data: (match?.data ?? []) as InferRouteHandler<T>,
                params: (currentMatch?.params as any) ?? ({} as any),
                url: currentMatch.url,
              });
            }
          };
          if (this.active) {
            startup();
          } else {
            this.whenStarted(() => {
              startup();
            });
          }
        }
        this.receiveEvent(
          options.preNavigation ? beforeNavigateEvent : navigationEvent,
          (data) => {
            const router = this.world.resolveComponent(ClientRouter);
            assert(!!router, "ClientRouter component not found");
            const matches: RouteMatch[] = options.preNavigation
              ? // @ts-ignore
                data.nextMatches
              : // @ts-ignore
                data.matches;
            const match = matches.find((m) => m.route === route);
            const currentMatch = route.match(router.href);
            if (currentMatch) {
              method.call(this, {
                data: (match?.data ?? []) as InferRouteHandler<T>,
                params: (currentMatch?.params as any) ?? ({} as any),
                url: currentMatch.url,
              });
            }
          },
        );
      });
    });
  };
}
