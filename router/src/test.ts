import { RoutePattern } from "@remix-run/route-pattern";
import {
  group,
  Router,
  RouteDefinition,
  type InferRouteHandler,
} from "./router";

const routeDefs = new RouteDefinition({
  root: new RoutePattern("*"),
  home: new RoutePattern("/"),
  about: group("/about", {
    root: "*",
    index: new RoutePattern("/"),
    details: new RoutePattern("/details"),
    more: new RoutePattern("/more"),
    company: group("/company", {
      root: "*",
      index: new RoutePattern("/"),
      about: new RoutePattern("/about"),
      contact: new RoutePattern("/contact"),
    }),
  }),
});

const handlersA = routeDefs.createHandlers({
  root: () => ({ meta: { title: "Company" } }),
  home: () => ({ meta: { title: "Home" } }),
  about: {
    root: () => ({ meta: { title: "About Root" } }),
    index: () => ({ meta: { title: "About" } }),
    details: () => ({ meta: { title: "About Details" } }),
    more: () => ({ meta: { title: "About More" } }),
    company: {
      root: () => "COMPANY ROOT",
      index: () => ({ meta: { title: "Company" } }),
      about: () => ({ meta: { title: "Company About" } }),
      contact: () => ({ meta: { title: "Company Contact" } }),
    },
  },
});

const handlersB = routeDefs.createHandlers({
  home: () => ({ meta: { title: "Home" } }),
  root: () => ({ meta: { title: "Company" } }),
  about: {
    root: () => ({ meta: { title: "About Root" } }),
    more: () => ({ meta: { title: "About More" } }),
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

const router = new Router(routeDefs, [handlersA, handlersB] as const);

const x = new RoutePattern("/foo/:id/idk?bar");

console.log(
  x.href({
    id: "123",
  }),
);

console.log(x.match("https://example.com/foo/123/idk?bar=1"));
