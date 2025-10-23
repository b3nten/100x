import type { Plugin } from "vite";

export class VirtualFileSystem {
	static ID = "virtual:vono/"

	get = (id: string) =>
		this.files.get(id)

	set = (id: string, code: string | (() => string | Promise<string>)) =>
		this.files.set(id, code)

	resolve = (id: string) => {
		if (id.startsWith(VirtualFileSystem.ID)) {
			return "\0" + id;
		}
		return null;
	}

	load = async (id: string) => {
		if(id.startsWith("\0" + VirtualFileSystem.ID)) {
			let path = id.replace("\0" + VirtualFileSystem.ID, "");
			const file = this.get(path);
			if (file) {
				if (typeof file === "string") {
					return file;
				} else {
					let result = file();
					if(result instanceof Promise) {
						return await result;
					} else {
						return result;
					}
				}
			}
		}
	}

	protected files = new Map<string, string | (() => string | Promise<string>)>()

	vitePlugin = (): Plugin => ({
		name: "vono-vfs",
		resolveId: this.resolve,
		load: this.load,
	})
}