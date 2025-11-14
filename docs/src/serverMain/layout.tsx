import type { PropsWithChildren } from "hono/jsx";

export function Layout(props: PropsWithChildren) {
	return <html>
		<head>
			<meta charSet="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
			<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
		</head>
		<body style="opacity: 0;">
			<canvas id="viewport" style="width: 100vw; height: 100vh; position: fixed; top: 0; left: 0; z-index: 0;" />
			{props.children}
		</body>
	</html>
}
