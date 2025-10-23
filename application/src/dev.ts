import {createServer, type UserConfig, type ViteDevServer} from "vite";
import { watchConfig} from "c12";
import {Vono} from "./mod.ts";
import {configure} from "./configure.ts";
import {Logger, LogLevel} from "@100x/engine/logging";

const logger = new Logger(
    "framework:dev",
    LogLevel.Info,
)

export async function dev() {
	const vite = new ViteDevInstance()

	async function init(configFile: any) {
		const vono = configFile.layers![0].config!;
		if(!vono || !("config" in vono)) {
			logger.error("Vono config not found. Ensure you have a `vono.config.{ts|js}` file in your current working directory, which exports a Vono instance as default.")
			logger.info(`See https://github.com/vonojs/framework for more information.`)
			process.exit(1)
		}
		await configure(vono, "dev")
		await vite.create(vono.config.vite)
	}

	logger.info("Starting Vono development server...")

	const configFile = await watchConfig<Vono>({
		configFile: "vono.config",
		onUpdate: async ({ newConfig }) => {
			await init(newConfig)
		}
	})

	await init(configFile)
}

class ViteDevInstance {
	async create(config: UserConfig) {
		let isRestart = !!this.server
		if(this.server) {
			await this.server.close()
		}
		this.server = await createServer(config)
		await this.server.listen(undefined, isRestart)
		logger.success(`Development server ${isRestart ? "restarted" : "started"} at http://localhost:${this.server.config.server.port}`)
	}
	server?: ViteDevServer
}

