import { Routes } from "@100x/router";

const routeDefs = new Routes("/", {
  home: "/",
});

export const handlers = routeDefs.createHandlers({
  home: () => ({
    meta: { title: "Home" },
  }),
});

export const routes = routeDefs.withHandlerTypes<typeof handlers>();
