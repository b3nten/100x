import { routeDefs } from "~/shared/routes";
import { DocsLayout } from "./layouts";
import { Home } from "./pages";

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
			view: (
				<DocsLayout currentPath="/docs/intro">
					<h1 class="retro-font text-3xl md:text-4xl text-white mb-6 pixel-border border-yellow-300">
						INTRODUCTION
					</h1>
					<div class="retro-font text-sm text-gray-300 space-y-4">
						<p>
							Welcome to 100x, a collection of high-performance libraries for building interactive web applications.
						</p>
						<p>
							Choose a package from the sidebar to get started.
						</p>
					</div>
				</DocsLayout>
			),
			meta: {
				title: "Introduction",
				description: "Introduction to 100x",
			}
		}),
		engine: {
			root: () => ({
				view: (
					<DocsLayout currentPath="/docs/engine">
						<h1 class="retro-font text-3xl md:text-4xl text-white mb-6 pixel-border border-yellow-300">
							ENGINE
						</h1>
						<div class="retro-font text-sm text-gray-300 space-y-4">
							<p>
								Documentation for the 100x Engine package.
							</p>
						</div>
					</DocsLayout>
				),
				meta: {
					title: "100x - Engine",
					description: "Engine for 100x",
				}
			}),
		},
		framework: {
			root: () => ({
				view: (
					<DocsLayout currentPath="/docs/framework">
						<h1 class="retro-font text-3xl md:text-4xl text-white mb-6 pixel-border border-yellow-300">
							FRAMEWORK
						</h1>
						<div class="retro-font text-sm text-gray-300 space-y-4">
							<p>
								Documentation for the 100x Framework package.
							</p>
						</div>
					</DocsLayout>
				),
				meta: {
					title: "100x - Framework",
					description: "Framework for 100x",
				}
			}),
		},
		router: {
			root: () => ({
				view: (
					<DocsLayout currentPath="/docs/router">
						<h1 class="retro-font text-3xl md:text-4xl text-white mb-6 pixel-border border-yellow-300">
							ROUTER
						</h1>
						<div class="retro-font text-sm text-gray-300 space-y-4">
							<p>
								Documentation for the 100x Router package.
							</p>
						</div>
					</DocsLayout>
				),
				meta: {
					title: "100x - Router",
					description: "Router for 100x",
				}
			}),
		},
		react: {
			root: () => ({
				view: (
					<DocsLayout currentPath="/docs/react">
						<h1 class="retro-font text-3xl md:text-4xl text-white mb-6 pixel-border border-yellow-300">
							REACT
						</h1>
						<div class="retro-font text-sm text-gray-300 space-y-4">
							<p>
								Documentation for the 100x React package.
							</p>
						</div>
					</DocsLayout>
				),
				meta: {
					title: "100x - React",
					description: "React for 100x",
				}
			}),
		}
	}
})
