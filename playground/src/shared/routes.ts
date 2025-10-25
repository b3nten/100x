import { RouteDefinition } from "@100x/router";

const routeDefs = new RouteDefinition({
  home: "/",
  about: "/about",
});

export const handlers1 = routeDefs.createHandlers({
  home: () => ({
    meta: { title: "Home" },
  }),
  about: () => ({
    meta: { title: "About" },
  }),
});

export const handlers2 = routeDefs.createHandlers({
  home: () => ({
    data: { message: "Welcome to the home page!" },
  }),
  about: () => ({
    data: { message: "Welcome to the about page!" },
  }),
});
