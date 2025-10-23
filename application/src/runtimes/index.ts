import {resolveThisDir} from "../utils.ts";
import path from "node:path";

export const runtimeDirectory = resolveThisDir(import.meta.url);

export const defaultRuntimes =  {
	client: {
		dev: path.join(runtimeDirectory, "dev", "client"),
			prod: path.join(runtimeDirectory, "prod", "client")
	},
	server: {
		dev: path.join(runtimeDirectory, "dev", "server"),
			prod: path.join(runtimeDirectory, "prod", "server"),
			rendererDev: path.join(runtimeDirectory, "dev", "renderer"),
			rendererProd: path.join(runtimeDirectory, "prod", "renderer"),
	},
}