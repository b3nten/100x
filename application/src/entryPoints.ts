import {resolveUnknownExtension} from "./utils.ts";
import path from "node:path";
import {Vono} from "./mod.ts";

type EntryPoint = {
	path: string,
}

export class VonoEntryPoints {
	serverMain?: EntryPoint
	serverDevMain?: EntryPoint
	serverProdMain?: EntryPoint
	serverRenderer?: EntryPoint
	serverDevRenderer?: EntryPoint
	serverProdRenderer?: EntryPoint
	clientMain?: EntryPoint
	clientDevMain?: EntryPoint
	clientProdMain?: EntryPoint

	getClientEntry(mode: "dev" | "prod") {
		return this[`client${mode === "dev" ? "Dev" : "Prod"}Main`] ?? this[`clientMain`]
	}

	getServerEntry(mode: "dev" | "prod") {
		return this[`server${mode === "dev" ? "Dev" : "Prod"}Main`] ?? this[`serverMain`]
	}

	getRendererEntry(mode: "dev" | "prod") {
		return this[`server${mode === "dev" ? "Dev" : "Prod"}Renderer`] ?? this[`serverRenderer`]
	}

	constructor(entries: Vono["config"]["files"]) {
		this.serverMain = this.resolveEntry(entries.server.main ?? "src/serverMain/main")
		this.serverDevMain = this.resolveEntry(entries.server.devMain ?? "src/serverMain/devMain")
		this.serverProdMain = this.resolveEntry(entries.server.prodMain ?? "src/serverMain/prodMain")
		this.serverRenderer = this.resolveEntry(entries.server.renderer ?? "src/serverMain/renderer")
		this.serverDevRenderer = this.resolveEntry(entries.server.devRenderer ?? "src/serverMain/devRenderer")
		this.serverProdRenderer = this.resolveEntry(entries.server.prodRenderer ?? "src/serverMain/prodRenderer")
		this.clientMain = this.resolveEntry(entries.client.main ?? "src/clientMain/main")
		this.clientDevMain = this.resolveEntry(entries.client.devMain ?? "src/clientMain/devMain")
		this.clientProdMain = this.resolveEntry(entries.client.prodMain ?? "src/clientMain/prodMain")
	}

	private resolveEntry(entry: string): EntryPoint | undefined {
		let resolvedAbsPath = resolveUnknownExtension(path.join(process.cwd(), entry))
		if (!resolvedAbsPath) {
			return
		}
		return {
			path: resolvedAbsPath
		}
	}
}