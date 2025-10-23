import { type Application, appInternal } from "./mod.ts";
import { ApplicationEntries } from "./entryPoints.ts";
import tsconfigPaths from "vite-tsconfig-paths";
import virtualServerFile from "./virtual/server.ts";
import { defaultRuntimes } from "./runtimes/index.ts";
import defu from "defu";
import { nitro } from "nitro/vite";
import consola from "consola";
import { absolutePathToRelative, resolveUnknownExtension } from "./utils.ts";
import { defaultEntries } from "./defaultEntries/index.ts";
import fs from "fs/promises";

export async function configure(app: Application, mode: "dev" | "prod") {
  app.vitePlugins(app.vfs.vitePlugin(), tsconfigPaths());

  try {
    await app[appInternal].userConfigFunction?.(app);
  } catch (e) {
    consola.error("Error in user's application config function:", e);
    process.exit(1);
  }

  for (const plugin of app.config.plugins) {
    try {
      await plugin(app);
    } catch (e) {
      consola.error(`Error in plugin ${plugin.name}:`, e);
      process.exit(1);
    }
  }

  const runtimePaths = {
    server: resolveUnknownExtension(
      app.config.runtimes.server[mode] ?? defaultRuntimes.server[mode],
    ),
    client: resolveUnknownExtension(
      app.config.runtimes.client[mode] ?? defaultRuntimes.client[mode],
    ),
    renderer: resolveUnknownExtension(
      mode === "dev"
        ? (app.config.runtimes.server.rendererDev ??
            defaultRuntimes.server.rendererDev)
        : (app.config.runtimes.server.rendererProd ??
            defaultRuntimes.server.rendererProd),
    ),
  };

  for (const [key, value] of Object.entries(runtimePaths)) {
    if (!value) {
      consola.error(
        `Runtime path ${value} for ${key} is not valid or does not exist.`,
      );
      process.exit(1);
    }
  }

  const entries = new ApplicationEntries(app.config.files);

  app.viteConfig({
    build: {
      manifest: true,
    },
    resolve: {
      alias: {
        "@100x/application/server": "virtual:100x/server",
        "@100x/application/serverEntry":
          entries.getServerEntry(mode)?.path ?? defaultEntries.server,
        "@100x/application/rendererEntry":
          entries.getRendererEntry(mode)?.path ?? defaultEntries.renderer,
        "@100x/application/clientEntry":
          entries.getClientEntry(mode)?.path ?? defaultEntries.client,
      },
    },
  });

  const relativeClientRuntime = absolutePathToRelative(runtimePaths.client!);
  if (!relativeClientRuntime) {
    consola.error(
      `Relative runtime path ${runtimePaths.client} for client is not valid or does not exist.`,
    );
    process.exit(1);
  }

  app.virtualFile(
    "server",
    virtualServerFile(relativeClientRuntime, runtimePaths.client!, mode),
  );

  app.virtualFile("vite-manifest", async () => {
    try {
      return `export default ${await fs.readFile("./.output/public/.vite/manifest.json", "utf-8")}`;
    } catch {
      return `export default {}`;
    }
  });

  const nitroConfig = defu(app.config.nitro, {
    devServer: {
      port: app.config.port ?? 8000,
    },
    serverEntry: runtimePaths.server,
    renderer: {
      entry: runtimePaths.renderer,
    },
    srcDir: app.config.serverDirectory ?? "src/serverMain",
  });

  // @ts-ignore
  app.vitePlugins(nitro({ config: nitroConfig }));

  app.viteConfig({
    environments: {
      client: {
        build: {
          rollupOptions: {
            input: runtimePaths.client!,
          },
        },
        consumer: "client",
      },
    },
  });

  for (const afterConfigCallback of app[appInternal].afterConfigCallbacks) {
    try {
      await afterConfigCallback(app);
    } catch (error) {
      consola.error(
        `Error in afterConfig callback ${afterConfigCallback.name}:`,
        error,
      );
      process.exit(1);
    }
  }
}
