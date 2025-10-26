import { isRunnableDevEnvironment, type Plugin } from "vite";
import type { ApplicationConfig } from "./config";
import { assert } from "@100x/engine/asserts";
import { createRequest, sendResponse } from "@remix-run/node-fetch-server";
import { Logger, LogLevel } from "@100x/engine/logging";

const logger = new Logger("application:dev", LogLevel.Info);

export function serverMiddleware(config: ApplicationConfig): Plugin {
  return {
    name: "100x-server-middleware",
    applyToEnvironment: (environment) => environment.name === "ssr",
    hotUpdate(ctx) {
      const { file, server } = ctx;
      const ssrGraph = server.environments.ssr?.moduleGraph;
      const ssrModule = ssrGraph?.getModuleById(file);
      if (ssrModule) {
        logger.info("Server updated, reloading client.");
        ctx.server.ws.send({
          type: "full-reload",
        });
      }
    },
    configureServer: (server) => {
      const env = server.environments["ssr"];
      assert(env, "Server environment not found");
      assert(
        isRunnableDevEnvironment(env),
        "Server environment is not runnable",
      );
      const runner = env.runner;
      return () => {
        server.middlewares.use(async (nodeRequest, nodeResponse, next) => {
          try {
            assert(config.runtimes.server.dev, "No server runtime??");
            const handler = await runner.import(config.runtimes.server.dev);
            const webRequest = createRequest(nodeRequest, nodeResponse);
            const webResponse = await handler.default(webRequest);
            sendResponse(nodeResponse, webResponse);
          } catch (e) {
            next(e);
          }
        });
      };
    },
  };
}
