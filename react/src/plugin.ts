import { applicationPlugin, type ApplicationPlugin } from "@100x/application";
import viteReact from "@vitejs/plugin-react";
import { runtimes } from "./runtimes/index.ts";
import lazyRoutes from "./lazy.ts";

export const reactPlugin = applicationPlugin(
  ({ plugin, vitePlugin, clientRuntime }) => {
    vitePlugin(
      viteReact({
        babel: {
          plugins: [
            ["@babel/plugin-proposal-decorators", { version: "2023-11" }],
          ],
        },
      }),
    );
    clientRuntime("dev", runtimes.clientDev);
    plugin(lazyRoutes);
  },
);

export default reactPlugin;
