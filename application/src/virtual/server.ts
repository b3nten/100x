export default (
  clientEntry: string,
  absoluteClientEntry: string,
  mode: string,
) => `
import m from 'virtual:100x/vite-manifest';
${
  mode === "dev"
    ? `export * from 'nitro/runtime';
export * from 'nitro/h3';`
    : `export * from "@100x/application/lib/nitro";`
}

export const manifest = m;

for(const key in manifest) {
    if(manifest[key].file && !manifest[key].file.startsWith("/")) {
        manifest[key].file = "/" + manifest[key].file;
    }
}

export const clientEntryPath = "${clientEntry}";

export const clientEntry = {
	...(manifest["${clientEntry}"] ?? {}),
	file: import.meta.env.DEV ? "${absoluteClientEntry}" : manifest["${clientEntry}"].file,
	css: import.meta.env.DEV ? [] : manifest["${clientEntry}"].css ?? [],
}

export function resolveEntry(path) {
	if(import.meta.env.DEV) {
		if(!path) {
			throw new Error("Entry path cannot be empty")
		}
		if(path.startsWith("/") || path.startsWith("./")) {
			throw new Error("Entry path must be relative to the project root, without a leading / or ./")
		}
		return {
			src: path,
  		    file: "${absoluteClientEntry}",
		}
	} else {
		return manifest[path];
	}
}`;
