import { Layout } from "./layouts";
import { NavBar, Hero, PixelButton } from "./components";

export function Home() {
	return (
		<Layout>
			<canvas id="viewport" style="width: 100vw; height: 100vh; position: fixed; top: 0; left: 0; z-index: 0;" />
			<NavBar />
			<Hero>
				<h1 class="retro-font text-4xl md:text-6xl text-white pixel-border-thick border-white nes-shadow-white">
					100X
				</h1>
				<p class="retro-font text-sm md:text-base text-yellow-300 max-w-2xl px-4">
					A collection of high-performance libraries for building interactive web applications
				</p>
				<div class="flex gap-4 justify-center mt-8">
					<PixelButton href="/docs/intro" variant="home">
						GET STARTED
					</PixelButton>
					<PixelButton href="https://github.com/b3nten/100x" variant="home">
						VIEW ON GITHUB
					</PixelButton>
				</div>
			</Hero>
		</Layout>
	);
}
