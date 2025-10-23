import { createBuilder } from "vite";
import {loadConfig,} from "c12";
import type {Vono} from "./mod.ts";
import {configure} from "./configure.ts";
import {Logger, LogLevel} from "@100x/engine/logging";

const logger = new Logger(
    "framework:dev",
    LogLevel.Info,
)

export async function build() {
	logger.info("Building app")
	const configFile = await loadConfig<Vono>({
		configFile: "vono.config",
	})

	const vono = configFile.layers![0].config!;

	if(!vono || !("config" in vono)) {
		logger.error("Vono config not found. Ensure you have a `vono.config.{ts|js}` file in your current working directory, which exports a Vono instance as default.")
		logger.info(`See https://github.com/vonojs/framework for more information.`)
		process.exit(1)
	}

	await configure(vono, "prod")

	const vite = await createBuilder(vono.config.vite)

	await vite.buildApp()

	console.log("")
	logger.success("Build completed")
}
