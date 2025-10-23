declare module "@vonojs/framework/server" {
	export * from "nitro/h3"
	export * from "nitro/runtime"
	export const clientEntryPath: string
	export const clientEntry: import("vite").ManifestChunk & { css: string[] }
	export const manifest: import("vite").Manifest
	export const resolveEntry: (path: string) => import("vite").ManifestChunk | undefined
}