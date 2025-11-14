import { Layout } from "./layout";
import { NavBar, Sidebar } from "./components";
import { routeDefs } from "~/shared/routes";
import type { PropsWithChildren } from "hono/jsx";

export function Home() {
	return (
		<Layout>
			<NavBar />
			<div class="fixed inset-0 flex items-center justify-center z-10 pointer-events-none">
				<div class="text-center space-y-6 pointer-events-auto">
					<div class="nes-container with-title is-rounded is-dark is-centered px-12 py-8">
						<p class='title'>docs</p>
						<h1 class="retro-font text-4xl md:text-6xl text-white nes-shadow-white pulse-animation">
							100X
						</h1>
						<p class="retro-font text-sm md:text-base nes-text is-warning max-w-2xl px-4 mt-6">
							A collection of high-performance libraries for building interactive web applications
						</p>
						<div class="flex gap-4 justify-center mt-8">
							<a
								type="button"
								class="nes-btn is-primary glitch-hover"
								href={routeDefs.definitions.docs.intro.href()}
								variant="home">
								GET STARTED
							</a>
							<a
								type="button"
								class="nes-btn glitch-hover"
								href="https://github.com/b3nten/100x"
								variant="home"
								target="_blank"
							>
								VIEW ON GITHUB
							</a>
						</div>
					</div>
				</div>
			</div>
		</Layout>
	);
}


export function Docs(props: PropsWithChildren<{ currentPath?: string; content?: string }>) {
	return (
		<Layout>
			<NavBar />
			<Sidebar currentPath={props.currentPath} />
			<main class="fixed left-72 right-2 top-32 bottom-8">
				<div class="nes-container is-rounded is-dark w-full! h-full overflow-y-scroll">
					{props.content ? (
						<div class="prose prose-invert prose-sm" dangerouslySetInnerHTML={{ __html: props.content }} />
					) : (
						props.children
					)}
				</div>
			</main>
		</Layout>
	);
}

export function NotFound() {
	return (
		<Layout>
			<NavBar />
			<div class="fixed inset-0 flex items-center justify-center z-10 pointer-events-none">
				<div class="text-center space-y-6 pointer-events-auto">
					<div class="nes-container with-title is-rounded is-dark is-centered px-12 py-8">
						<p class='title'>404</p>
						<h1 class="retro-font text-4xl md:text-6xl text-white nes-shadow-white pulse-animation">
							NOT FOUND
						</h1>
						<p class="retro-font text-sm md:text-base nes-text is-warning max-w-2xl px-4 mt-6">
							The page you are looking for does not exist.
						</p>
						<div class="flex gap-4 justify-center mt-8">
							<a
								type="button"
								class="nes-btn is-primary"
								href={routeDefs.definitions.docs.intro.href()}
								variant="home">
								GO BACK HOME
							</a>
						</div>
					</div>
				</div>
			</div>
		</Layout>
	);
}
