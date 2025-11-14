import { clientEntry } from "@100x/application/server";
import { createHead, transformHtmlTemplate } from "unhead/server";
import { Hono } from "hono";
import { renderToString } from "hono/jsx/dom/server";
import { Router } from "@100x/router";
import { routeDefs } from "~/shared/routes";
import { handlers } from "./handlers";
import { NotFound } from "./pages";

const app = new Hono();
const router = new Router(
	routeDefs,
	[handlers] as const
)

app.get("*", async (c) => {
	const head = createHead();

	head.push({
		link: clientEntry.css.map((href) => ({ rel: "stylesheet", href })),
		script: [{ src: clientEntry.file, type: "module" }],
	});

	const matches = router.match(c.req.url);

	let view: any = null;

	for (const match of matches) {
		for (const result of match.data) {
			if (
				result &&
				typeof result === "object" &&
				"meta" in result &&
				result.meta
			) {
				head.push(result.meta);
			}
			if(
				result &&
				typeof result === "object" &&
				"view" in result &&
				result.view
			){
				view = result.view;
			}
		}
	}

	if(!view) {
		view = NotFound();
	}

	view = await view;

	console.log(view)

	return c.html(
		transformHtmlTemplate(
			head,
			renderToString(view)
		),
	);
});

export default app.fetch;
