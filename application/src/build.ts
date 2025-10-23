import { createBuilder } from "vite";
import { loadConfig } from "c12";
import { Application } from "./mod.ts";
import { configure } from "./configure.ts";
import { Logger, LogLevel } from "@100x/engine/logging";

const logger = new Logger("application:build", LogLevel.Info);

export async function build() {
  logger.info("Building app");
  const configFile = await loadConfig<Application>({
    configFile: "app.config",
  });

  const app = configFile.layers![0].config ?? new Application();

  await configure(app, "prod");

  const vite = await createBuilder(app.config.vite);

  await vite.buildApp();

  console.log("");
  logger.success("Build completed");
}
