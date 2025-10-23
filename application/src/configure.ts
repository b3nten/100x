import { type Vono, vonoInternal } from "./mod.ts";
import { VonoEntryPoints } from "./entryPoints.ts";
import tsconfigPaths from "vite-tsconfig-paths";
import virtualServerFile from "./virtual/server.ts";
import { defaultRuntimes } from "./runtimes/index.ts";
import defu from "defu";
import { nitro } from "nitro/vite";
import consola from "consola";
import { absolutePathToRelative, resolveUnknownExtension } from "./utils.ts";
import { defaultEntries } from "./defaultEntries/index.ts";
import fs from "fs/promises";

export async function configure(vono: Vono, mode: "dev" | "prod") {
  vono.vitePlugins(vono.vfs.vitePlugin(), tsconfigPaths());

  try {
    await vono[vonoInternal].userConfigFunction?.(vono);
  } catch (e) {
    consola.error("Error in vono config function:", e);
    process.exit(1);
  }

  for (const plugin of vono.config.plugins) {
    try {
      await plugin(vono);
    } catch (e) {
      consola.error(`Error in plugin ${plugin.name}:`, e);
      process.exit(1);
    }
  }

  const runtimePaths = {
    server: resolveUnknownExtension(
      vono.config.runtimes.server[mode] ?? defaultRuntimes.server[mode],
    ),
    client: resolveUnknownExtension(
      vono.config.runtimes.client[mode] ?? defaultRuntimes.client[mode],
    ),
    renderer: resolveUnknownExtension(
      mode === "dev"
        ? (vono.config.runtimes.server.rendererDev ??
            defaultRuntimes.server.rendererDev)
        : (vono.config.runtimes.server.rendererProd ??
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

  const entries = new VonoEntryPoints(vono.config.files);

  vono.viteConfig({
    build: {
      manifest: true,
    },
    resolve: {
      alias: {
        "@vonojs/framework/server": "virtual:vono/server",
        "@vonojs/framework/serverEntry":
          entries.getServerEntry(mode)?.path ?? defaultEntries.server,
        "@vonojs/framework/rendererEntry":
          entries.getRendererEntry(mode)?.path ?? defaultEntries.renderer,
        "@vonojs/framework/clientEntry":
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

  vono.virtualFile(
    "server",
    virtualServerFile(relativeClientRuntime, runtimePaths.client!, mode),
  );

  vono.virtualFile("vite-manifest", async () => {
    try {
      return `export default ${await fs.readFile("./.output/public/.vite/manifest.json", "utf-8")}`;
    } catch {
      return `export default {}`;
    }
  });

  const nitroConfig = defu(vono.config.nitro, {
    devServer: {
      port: vono.config.port ?? 8000,
    },
    serverEntry: runtimePaths.server,
    renderer: {
      entry: runtimePaths.renderer,
    },
    routesDir: vono.config.apiRouteDirectory ?? "src/serverMain/routes",
  });

  // @ts-ignore
  vono.vitePlugins(nitro({ config: nitroConfig }));

  vono.viteConfig({
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

  for (const afterConfigCallback of vono[vonoInternal].afterConfigCallbacks) {
    try {
      await afterConfigCallback(vono);
    } catch (error) {
      consola.error(
        `Error in afterConfig callback ${afterConfigCallback.name}:`,
        error,
      );
      process.exit(1);
    }
  }
}
