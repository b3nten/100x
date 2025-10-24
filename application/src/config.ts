import type { DeepPartial, DeepReadonly } from "@100x/engine/types";
import defu from "defu";
import type {
  PluginOption as VitePlugin,
  UserConfig as ViteConfig,
} from "vite";
import { VirtualFileSystem } from "./vfs";
import tsConfigPaths from "vite-tsconfig-paths";
import { serverMiddleware } from "./serverMiddleware";
import { runCatching } from "@100x/engine/lib";
import {
  AbsolutePath,
  fileExists,
  RelativePath,
  resolveUnknownExtension,
} from "./utils.ts";
import { defaultRuntimes, runtimeDirectory } from "./runtimes/paths.ts";
import { defaultEntries } from "./defaultEntries/index.ts";
import { join } from "path";
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import virtualServerFile from "./virtual/server.ts";
import { colors, Logger, logger, LogLevel } from "@100x/engine/logging";
import { isUndefined } from "@100x/engine/checks";
import * as toml from "@std/toml";

export type ApplicationPlugin = (
  config: ApplicationConfigurator,
) => void | Promise<void>;

export const applicationPlugin = (
  plugin: ApplicationPlugin,
): ApplicationPlugin => plugin;

export type BuildPlugin = (
  config: ApplicationConfigurator,
) => void | Promise<void>;

export const buildPlugin = (plugin: BuildPlugin): BuildPlugin => plugin;

export type ApplicationConfig = {
  mode: "dev" | "prod";
  port?: number;
  plugins: ApplicationPlugin[];
  vite: {
    plugins: VitePlugin[];
  };
  files: {
    server?: string | null | undefined;
    client?: string | null | undefined;
  };
  runtimes: {
    server: {
      dev?: string;
      prod?: string;
    };
    client: {
      dev?: string;
      prod?: string;
    };
  };
  buildFunction?: BuildPlugin;
  vfs: VirtualFileSystem;
  beforeBuildCallbacks: Set<Function>;
  afterBuildCallbacks: Set<Function>;
  afterConfigCallbacks: Set<Function>;
};

export class ApplicationConfigurator {
  get config() {
    return this._config as DeepReadonly<ApplicationConfig>;
  }

  constructor(private _config: ApplicationConfig) {}

  get mode() {
    return this._config.mode;
  }

  readonly port = (port: number) => {
    this._config.port = port;
  };

  readonly serverEntry = (entry: string | null | undefined) => {
    this._config.files.server = entry;
  };

  readonly clientEntry = (entry: string | null | undefined) => {
    this._config.files.client = entry;
  };

  readonly serverRuntime = (mode: "dev" | "prod", path: string) => {
    this._config.runtimes.server[mode] = path;
  };

  readonly clientRuntime = (mode: "dev" | "prod", path: string) => {
    this._config.runtimes.client[mode] = path;
  };

  readonly plugin = (plugin: ApplicationPlugin) => {
    this._config.plugins.push(plugin);
  };

  readonly vitePlugin = (...plugins: VitePlugin[]) => {
    this._config.vite.plugins.push(...plugins);
  };

  readonly viteConfig = (config: DeepPartial<ViteConfig>) => {
    this._config.vite = defu(this._config.vite, config);
  };

  readonly afterConfig = (callback: Function) => {
    this._config.afterConfigCallbacks.add(callback);
  };

  readonly beforeBuild = (callback: Function) => {
    this._config.beforeBuildCallbacks.add(callback);
  };

  readonly afterBuild = (callback: Function) => {
    this._config.afterBuildCallbacks.add(callback);
  };

  readonly virtualFile = (
    path: string,
    file: string | (() => string | Promise<string>),
  ) => {
    this._config.vfs.set(path, file);
  };

  readonly buildFor = (plugin: BuildPlugin) => {
    this._config.buildFunction = plugin;
  };

  get vfs() {
    return this._config.vfs;
  }
}

export async function configureApplication(args: {
  mode: "dev" | "prod";
  userConfigFunction?: (app: ApplicationConfigurator) => void | Promise<void>;
  logger: Logger;
}) {
  const { mode, userConfigFunction, logger } = args;
  const config: ApplicationConfig = {
    mode,
    vite: {
      plugins: [],
    },
    files: {},
    runtimes: {
      server: {},
      client: {},
    },
    plugins: [],
    vfs: new VirtualFileSystem(),
    afterConfigCallbacks: new Set(),
    beforeBuildCallbacks: new Set(),
    afterBuildCallbacks: new Set(),
  };
  const app = new ApplicationConfigurator(config);

  // begin config app

  app.vitePlugin(
    config.vfs.vitePlugin(),
    tsConfigPaths(),
    serverMiddleware(config),
  );

  app.virtualFile("vite-manifest", async () => {
    try {
      return `export default ${readFileSync("./dist/public/.vite/manifest.json", "utf-8")}`;
    } catch {
      return `export default {}`;
    }
  });

  try {
    await userConfigFunction?.(app);
  } catch (e) {
    logger.critical("Error in user's application config function:", e);
    process.exit(1);
  }

  for (const plugin of config.plugins) {
    try {
      await plugin(app);
    } catch (e) {
      logger.error(`Error in plugin ${plugin.name}:`, e);
      process.exit(1);
    }
  }

  try {
    await config.buildFunction?.(app);
  } catch (e) {
    logger.error(`Error in build plugin:`, e);
    process.exit(1);
  }

  if (isUndefined(config.files.client) || isUndefined(config.files.server)) {
    const replacementText = !config.files.client
      ? !config.files.server
        ? "client and server entries"
        : "client entry"
      : "server entry";
    logger.warn(
      `No ${replacementText} specified in config, using defaults. If this is the intended behavior, set the client entry to null.`,
    );
  }

  const serverEntry = runCatching(() =>
    AbsolutePath.FromWorkingDir(
      app.config.files.server ?? defaultEntries.server,
    ),
  );

  if (!serverEntry.ok) {
    logger.error("The path to the server entry is invalid:", serverEntry.error);
    process.exit(1);
  }

  config.files.server = serverEntry.value.path;

  const clientEntry = runCatching(() =>
    AbsolutePath.FromWorkingDir(
      app.config.files.client ?? defaultEntries.client,
    ),
  );

  if (!clientEntry.ok) {
    logger.error("The path to the client entry is invalid:", clientEntry.error);
    process.exit(1);
  }

  config.files.client = clientEntry.value.path;

  const serverRuntime = runCatching(() =>
    AbsolutePath.FromWorkingDir(
      app.config.runtimes.server[mode] ?? defaultRuntimes.server[mode],
    ),
  );

  if (!serverRuntime.ok) {
    logger.error(
      "The path to the server runtime is invalid:",
      serverRuntime.error,
    );
    process.exit(1);
  }

  config.runtimes.server[mode] = serverRuntime.value.path;

  const clientRuntime = runCatching(() =>
    AbsolutePath.FromWorkingDir(
      app.config.runtimes.client[mode] ?? defaultRuntimes.client[mode],
    ),
  );

  if (!clientRuntime.ok) {
    logger.error(
      "The path to the client runtime is invalid:",
      clientRuntime.error,
    );
    process.exit(1);
  }

  config.runtimes.client[mode] = clientRuntime.value.path;

  app.virtualFile(
    "server",
    virtualServerFile(
      RelativePath.StripWorkingDir(clientEntry.value).path, // relative client entry
      clientRuntime.value.path, // abs client runtime
      mode,
    ),
  );

  // shared config
  app.viteConfig({
    appType: "custom",
    server: {
      port: 8000,
    },
    resolve: {
      alias: {
        "@100x/application/server": "virtual:100x/server",
        "@100x/application/serverEntry": serverEntry.value.path,
        "@100x/application/clientEntry": clientEntry.value.path,
      },
    },
  });

  // client config
  app.viteConfig({
    environments: {
      client: {
        build: {
          emptyOutDir: false,
          manifest: true,
          outDir: "dist/public",
          rollupOptions: {
            input: {
              main: clientEntry.value.path,
            },
            output: {
              entryFileNames: "immutable/[name].[hash].js",
              chunkFileNames: "immutable/[name].[hash].js",
              assetFileNames: "immutable/[name].[hash][extname]",
              sourcemapFileNames: "immutable/[name].[hash].map",
            },
          },
        },
        consumer: "client",
      },
    },
  });

  // server config
  app.viteConfig({
    environments: {
      ssr: {
        build: {
          emptyOutDir: false,
          copyPublicDir: false,
          rollupOptions: {
            input: {
              main: serverRuntime.value.path,
            },
            output: {
              dir: "dist",
              chunkFileNames: "server/[name].js",
            },
          },
        },
        consumer: "server",
      },
    },
  });

  // require to have manifest ready for server build
  app.viteConfig({
    builder: {
      async buildApp(builder) {
        try {
          rmSync("dist");
        } catch {}
        await builder.build(builder.environments["client"]!);
        await builder.build(builder.environments["ssr"]!);
      },
    },
  });

  for (const afterConfigCallback of config.afterConfigCallbacks) {
    try {
      await afterConfigCallback(app);
    } catch (error) {
      logger.error(
        `Error in afterConfig callback ${afterConfigCallback.name}:`,
        error,
      );
      process.exit(1);
    }
  }

  return config;
}

export const BuildTargets = {
  Node: buildPlugin(({ serverRuntime, viteConfig, mode }) => {
    serverRuntime("prod", join(runtimeDirectory, "node", "prod", "server"));
    if (mode === "prod") {
      viteConfig({
        ssr: {
          target: "node",
          noExternal: true,
        },
      });
    }
  }),
  Cloudflare: buildPlugin(
    ({ serverRuntime, viteConfig, beforeBuild, afterBuild, mode }) => {
      const logger = new Logger(
        "build:cloudflare",
        LogLevel.Info,
        colors.orange,
      );

      serverRuntime(
        "prod",
        join(runtimeDirectory, "cloudflare", "prod", "server"),
      );

      afterBuild(() => {
        const path = resolveUnknownExtension("wrangler", [
          ".json",
          ".jsonc",
          ".toml",
        ]);
        if (!path) {
          writeFileSync(
            "wrangler.jsonc",
            JSON.stringify(
              {
                name: "100x-application",
                compatibility_date: new Date().toISOString().split("T")[0],
                main: "dist/main.js",
                assets: {
                  html_handling: "none",
                  directory: "dist/public",
                },
              },
              null,
              2,
            ),
            "utf8",
          );
          logger.info(
            "Wrangler configuration file created. Be sure to update the name of your project.",
          );
        } else if (path.endsWith(".json") || path.endsWith(".jsonc")) {
          const file = readFileSync(path, "utf8");
          const config = JSON.parse(file);
          config.main = "dist/main.js";
          config.assets = {
            html_handling: "none",
            directory: "dist/public",
          };
          writeFileSync(path, JSON.stringify(config, null, 2), "utf8");
          logger.info("Wrangler configuration file updated.");
        } else {
          const file = readFileSync(path, "utf8");
          const config = toml.parse(file);
          config.main = "dist/main.js";
          config.assets = {
            html_handling: "none",
            directory: "dist/public",
          };
          writeFileSync(path, toml.stringify(config), "utf8");
          logger.info("Wrangler configuration file updated.");
        }

        logger.info("Preview: npx wrangler dev");
        logger.info("Deploy: npx wrangler publish");
      });

      if (mode === "prod") {
        viteConfig({
          ssr: {
            target: "webworker",
            noExternal: true,
          },
        });
      }
    },
  ),
  NetlifyFunctions: buildPlugin(
    ({ serverRuntime, viteConfig, afterBuild, mode }) => {
      serverRuntime(
        "prod",
        join(runtimeDirectory, "netlify", "prod", "server"),
      );

      afterBuild(async () => {
        if (await fileExists("netlify.toml")) {
          const file = readFileSync("netlify.toml", "utf8");
          const config = toml.parse(file);
          config.build ??= {};
          (config.build as any).publish = "dist/public";
          config.functions ??= {};
          (config.functions as any).directory = "dist/";
          writeFileSync("netlify.toml", toml.stringify(config), "utf8");
          logger.info("Netlify configuration file updated.");
        } else {
          const config = {
            build: {
              publish: "dist/public",
            },
            functions: {
              directory: "dist/",
            },
          };
          writeFileSync("netlify.toml", toml.stringify(config), "utf8");
          logger.info("Netlify configuration file created.");
        }
      });

      if (mode === "prod") {
        viteConfig({
          ssr: {
            target: "node",
            noExternal: true,
          },
        });
      }
    },
  ),
  NetlifyEdge: buildPlugin(
    ({ serverRuntime, viteConfig, afterBuild, mode }) => {
      serverRuntime(
        "prod",
        join(runtimeDirectory, "netlify", "prod", "server"),
      );

      afterBuild(async () => {
        if (await fileExists("netlify.toml")) {
          const file = readFileSync("netlify.toml", "utf8");
          const config = toml.parse(file);
          config.build ??= {};
          (config.build as any).publish = "dist/public";
          (config.build as any).edge_functions = "dist";

          writeFileSync("netlify.toml", toml.stringify(config), "utf8");
          logger.info("Netlify configuration file updated.");
        } else {
          const config = {
            build: {
              publish: "dist/public",
              edge_functions: "dist",
            },
          };
          writeFileSync("netlify.toml", toml.stringify(config), "utf8");
          logger.info("Netlify configuration file created.");
        }
      });

      if (mode === "prod") {
        viteConfig({
          ssr: {
            target: "webworker",
            noExternal: true,
          },
        });
      }
    },
  ),
  Vercel: buildPlugin(
    async ({ afterBuild, viteConfig, mode, serverRuntime }) => {
      serverRuntime("prod", join(runtimeDirectory, "vercel", "prod", "server"));

      afterBuild(() => {
        cpSync("dist/public", ".vercel/output/static", { recursive: true });
        cpSync("dist/main.js", ".vercel/output/functions/main.func/main.js");
        try {
          cpSync("dist/server", ".vercel/output/functions/main.func/server");
        } catch {}
        writeFileSync(
          ".vercel/output/functions/main.func/.vc-config.json",
          JSON.stringify(
            {
              handler: "main.js",
              runtime: "nodejs24.x",
              launcherType: "Nodejs",
              supportsResponseStreaming: true,
            },
            null,
            2,
          ),
        );
        rmSync("dist", { recursive: true, force: true });
      });

      if (mode === "prod") {
        viteConfig({
          ssr: {
            target: "node",
            noExternal: true,
          },
        });
      }
    },
  ),
} satisfies Record<string, BuildPlugin>;

Object.freeze(BuildTargets);
