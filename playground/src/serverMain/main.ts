import { clientEntry } from "@100x/application/server";
import { Hono } from "hono";

const app = new Hono();

app.get("/api/ping", (c) => c.text("pong"));

app.get("*", (c) =>
  c.html(`
  <!DOCTYPE html>
  <head>
  ${clientEntry.css.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n")}
	  <script type="module" src="${clientEntry.file}"></script>
	</head>
	<body>
	  <h1>Hello World!</h1>
		<p>Welcome to 100x!</p>
	</body>
	</html>
`),
);

export default app.fetch;
