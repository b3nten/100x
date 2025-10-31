import {
  createContext,
  createElement,
  type PropsWithChildren,
  use,
  useEffect,
  useState,
} from "react";
import { ClientRouter } from "@100x/router";
import { nonNullOrThrow } from "@100x/engine/asserts";
import { useWorld } from "./ecs";
import { navigationEvent } from "../../router/.build/client";

export const routerContext = createContext<ClientRouter<any, any> | null>(null);

export const useRouter = () => {
  const world = useWorld()?.resolveComponent(ClientRouter);
  const routerCtx = use(routerContext);
  const router = nonNullOrThrow(
    world ?? routerCtx,
    "useRouter must be used within a RouterProvider or world with ClientRouter",
  );

  const [routerState, setRouterState] = useState(() =>
    createRouterData(router),
  );

  useEffect(
    () =>
      router.register(navigationEvent, () => {
        setRouterState(createRouterData(router));
      }),
    [router],
  );

  return routerState;
};

const createRouterData = (r: ClientRouter<any, any>) => ({
  get url() {
    return r.url;
  },
  get searchParams() {
    return r.searchParams;
  },
  get pathname() {
    return r.pathname;
  },
  get hash() {
    return r.hash;
  },
  get href() {
    return r.href;
  },
  get router() {
    return r;
  },
});

export const RouterProvider = (
  props: PropsWithChildren<{ router: ClientRouter<any, any> }>,
) =>
  createElement(
    routerContext.Provider,
    { value: props.router },
    props.children,
  );
