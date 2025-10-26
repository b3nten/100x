import { Router, RouteDefinition, type InferRouteHandler } from "./router";
import { group } from "./group";

const routeDefs = new RouteDefinition({
  root: "*",
  home: "/",
  about: group("/about", {
    index: "/",
    details: "/details",
    more: "/more/:foo",
    company: group("/company", {
      index: "/",
      about: "/about",
      contact: "/contact",
    }),
  }),
});

const handlersA = routeDefs.createHandlers({
  root: (url, {}) => ({ meta: { title: "Company" } }),
  home: () => ({ meta: { title: "Home" } }),
  about: {
    // root: () => ({ meta: { title: "About Root" } }),
    index: () => ({ meta: { title: "About" } }),
    details: () => ({ meta: { title: "About Details" } }),
    more: () => ({ meta: { title: "About More" } }),
    company: {
      // root: () => "COMPANY ROOT",
      index: () => ({ meta: { title: "Company" } }),
      about: () => ({ meta: { title: "Company About" } }),
      // contact: () => ({ meta: { title: "Company Contact" } }),
    },
  },
});

const handlersB = routeDefs.createHandlers({
  home: () => ({ meta: { title: "Home" } }),
  root: () => ({ meta: { title: "Company" } }),
  about: {
    root: () => ({ meta: { title: "About Root" } }),
    more: () => ({ about: { title: "About More" } }),
    details: () => ({
      details: "details",
    }),
    index: () => ({
      index: "index",
    }),
    company: {
      contact: () => ({ meta: { title: "Company Contact" } }),
      index: () => ({ meta: { title: "Company Index" } }),
    },
  },
});

// const router = new Router(routeDefs, [handlersA, handlersB] as const);
// router.routes.root;
// router.routes.about.more;

// const X: InferRouteHandler<typeof router.routes.about.more>;
