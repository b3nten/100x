import { createServer, type UserConfig, type ViteDevServer } from "vite";
import { watchConfig } from "c12";
import { Application } from "./mod.ts";
import { configure } from "./configure.ts";
import { Logger, LogLevel } from "@100x/engine/logging";

const logger = new Logger("application:dev", LogLevel.Info);

export async function dev() {
  const vite = new ViteDevInstance();

  async function init(configFile: any) {
    let app = configFile.layers![0].config! as Application;
    if (!app || !("config" in app)) {
      app = new Application();
    }
    await configure(app, "dev");
    await vite.create(app.config.vite);
  }

  logger.info("Starting development server...");

  const configFile = await watchConfig<Application>({
    configFile: "app.config",
    onUpdate: async ({ newConfig }) => {
      await init(newConfig);
    },
  });

  await init(configFile);
}

class ViteDevInstance {
  async create(config: UserConfig) {
    let isRestart = !!this.server;
    if (this.server) {
      await this.server.close();
    }
    this.server = await createServer(config);
    await this.server.listen(undefined, isRestart);
    logger.success(
      `Development server ${isRestart ? "restarted" : "started"} at http://localhost:${this.server.config.server.port}`,
    );
  }
  server?: ViteDevServer;
}
