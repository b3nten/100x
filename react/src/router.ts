import {
  createContext,
  createElement,
  type PropsWithChildren,
  use,
  useEffect,
} from "react";
import { ClientRouter } from "@100x/router";
import { nonNullOrThrow } from "@100x/engine/asserts";

export const routerContext = createContext<ClientRouter | null>(null);

export const useRouter = () =>
  nonNullOrThrow(
    use(routerContext),
    "useRouter must be used within a RouterProvider",
  );

export const RouterProvider = (
  props: PropsWithChildren<{ router: ClientRouter }>,
) =>
  createElement(
    routerContext.Provider,
    { value: props.router },
    props.children,
  );
