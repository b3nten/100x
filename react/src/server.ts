import {
  clientEntry,
  defineRenderHandler,
  type HTTPEvent,
} from "@100x/application/server";
import { type Routes, type RoutesWithHandlerType, Router } from "@100x/router";
import { createHead, transformHtmlTemplate } from "unhead/server";

export class PageRenderer {
  constructor(routes: RoutesWithHandlerType<any, any>, handlers: any) {
    this.router = new Router(routes, handlers);
  }

  render = (ctx: HTTPEvent) => {
    const head = createHead();
    this.router.match(ctx.req.url).forEach((match) => {
      const result = match.handler();
      if (
        result &&
        typeof result === "object" &&
        "meta" in result &&
        result.meta
      ) {
        head.push(result.meta);
      }
    });
    return {
      body: transformHtmlTemplate(head, this.template),
      headers: {
        "content-type": "text/html",
      },
    };
  };

  renderHandler = defineRenderHandler(this.render);

  template = `
<!DOCTYPE html>
<head>
${clientEntry.css.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n")}
<script type="module" src="${clientEntry.file}"></script>
</head>
<body></body>
</html>`;

  protected router: Router<any, any>;
}
