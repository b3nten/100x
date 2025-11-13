import { group, RouteDefinition } from "@100x/router";

export const routeDefs = new RouteDefinition({
	root: "*",
	home: "/",
	docs: group("/docs", {
		intro: "/intro",
		engine: group("/engine", {
			index: "/",
		}),
		framework: group("/framework", {
			index: "/",
		}),
		router: group("/router", {
			index: "/",
		}),
		react: group("/react", {
			index: "/",
		})
	})
});
