import { routeDefs } from "~/shared/routes";
import { Docs } from "./pages";
import { Home } from "./pages";
import { getDocsFor } from "../../content/content";

export const handlers = routeDefs.createHandlers({
	root: () => ({
		meta: {
			title: "100x Docs",
			description: "Documentation for 100x, a set of packages for interative web applications",
		},
	}),
	home: () => ({
		view: <Home />
	}),
	docs: {
		intro: () => ({
			view: getDocsFor("intro").then(x => <Docs content={x} />),
			meta: {
				title: "100x - Intro",
				description: "Introduction to 100x",
			}
		}),
		engine: {
			root: () => ({
				view: getDocsFor("engine").then(x => <Docs content={x} />),
				meta: {
					title: "100x - Engine",
					description: "Engine for 100x",
				}
			}),
		},
		framework: {
			root: () => ({
				view: getDocsFor("framework").then(x => <Docs content={x} />),
				meta: {
					title: "100x - Framework",
					description: "Framework for 100x",
				}
			}),
		},
		router: {
			root: () => ({
				view: getDocsFor("router").then(x => <Docs content={x} />),
				meta: {
					title: "100x - Router",
					description: "Router for 100x",
				}
			}),
		},
		react: {
			root: () => ({
				view: getDocsFor("react").then(x => <Docs content={x} />),
				meta: {
					title: "100x - React",
					description: "React for 100x",
				}
			}),
		}
	}
})
