import { createServer, type UserConfig, type ViteDevServer } from "vite";
import { watchConfig } from "c12";
import { Logger, LogLevel } from "@100x/engine/logging";
import { noop } from "@100x/engine/lib";
import { configureApplication, type ApplicationPlugin } from "./config.ts";

const logger = new Logger("application:dev", LogLevel.Info);

export async function dev() {
  const vite = new ViteDevInstance();

  async function init({
    userConfigFunction,
  }: {
    userConfigFunction: ApplicationPlugin;
  }) {
    const config = await configureApplication({
      logger,
      mode: "dev",
      userConfigFunction,
    });
    await vite.create(config.vite);
  }

  logger.info("Starting development server...");

  const configFile = await watchConfig<{
    userConfigFunction: ApplicationPlugin;
  }>({
    configFile: "app.config",
    onUpdate: async ({ newConfig }) => {
      await init(newConfig.config);
    },
  });

  await init(configFile.config);
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
