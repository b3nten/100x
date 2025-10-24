import { createBuilder } from "vite";
import { loadConfig } from "c12";
import { Logger, LogLevel } from "@100x/engine/logging";
import { configureApplication, type ApplicationPlugin } from "./config.ts";

const logger = new Logger("application:build", LogLevel.Info);

export async function build() {
  logger.info("Building app");

  const configFile = await loadConfig<{
    userConfigFunction: ApplicationPlugin;
  }>({
    configFile: "app.config",
  });

  const config = await configureApplication({
    logger,
    mode: "prod",
    userConfigFunction: configFile.config.userConfigFunction,
  });

  const vite = await createBuilder(config.vite);

  await vite.buildApp();

  console.log("");
  logger.success("Build completed");
}
