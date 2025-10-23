import type { ApplicationPlugin } from "@100x/application";
import viteReact from "@vitejs/plugin-react";
import { runtimes } from "./runtimes/index.ts";
import lazyRoutes from "./lazy.ts";

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

  app.plugin(lazyRoutes);
};

export default reactPlugin;
