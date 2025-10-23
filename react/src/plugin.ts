import type { ApplicationPlugin } from "@100x/application";
import viteReact from "@vitejs/plugin-react";
import { runtimes } from "./runtimes/index.ts";
import lazyRoutes from "./lazy.ts";
import * as fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const reactPlugin: ApplicationPlugin = (app) => {
  app.vitePlugins(
    viteReact({
      babel: {
        plugins: [
          ["@babel/plugin-proposal-decorators", { version: "2023-11" }],
        ],
      },
    }),
  );

  app.runtimes((r) => {
    r.client.dev = runtimes.clientDev;
  });

  // vite can't alias @100x/application/server for packages for some reason
  // so we use a virtual file instead
  const thisDirectory = dirname(fileURLToPath(import.meta.url));
  app.virtualFile("react/server", () =>
    fs.readFileSync(join(thisDirectory, "./server.js"), "utf-8"),
  );
  app.viteConfig({
    resolve: {
      alias: {
        "@100x/react/server": "virtual:100x/react/server",
      },
    },
  });

  app.plugin(lazyRoutes);
};

export default reactPlugin;
