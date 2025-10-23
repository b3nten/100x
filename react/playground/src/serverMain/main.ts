import { defineHandler } from "@100x/application/server";

function loggingMiddleware(url: URL) {
  console.log(`[${Date.now()}] request: ${url.pathname}`);
}

export default defineHandler((ctx) => {
  loggingMiddleware(ctx.url);
});