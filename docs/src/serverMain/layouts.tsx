import type { PropsWithChildren } from "hono/jsx";
import { NavBar, Sidebar } from "./components";

export function Layout(props: PropsWithChildren) {
	return <html>
		<head>
			<meta charSet="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
			<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
		</head>
		<body>
			{props.children}
		</body>
	</html>
}

export function DocsLayout(props: PropsWithChildren<{ currentPath?: string; content?: string }>) {
	return (
		<Layout>
			<NavBar />
			<scroll-progress />
			<Sidebar currentPath={props.currentPath} />
			<main class="ml-64 mt-[57px] p-8">
				<div class="max-w-4xl">
					{props.content ? (
						<div class="prose prose-invert prose-sm md:prose-base" dangerouslySetInnerHTML={{ __html: props.content }} />
					) : (
						props.children
					)}
				</div>
			</main>
		</Layout>
	);
}
