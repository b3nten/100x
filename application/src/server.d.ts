declare module "@100x/application/server" {
  export const clientEntryPath: string;
  export const clientEntry: import("vite").ManifestChunk & { css: string[] };
  export const manifest: import("vite").Manifest;
  export const resolveEntry: (
    path: string,
  ) => import("vite").ManifestChunk | undefined;
}
