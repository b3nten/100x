import { Builder, keepStructurePlugin } from "../builder";

const builder = new Builder({
  entryPoints: ["src/mod.ts"],
  external: ["@100x/engine"],
  bundle: true,
  format: "esm",
  target: ["es2022"],
  plugins: [],
});

builder.cleanOutputDir(".build");

await builder.build({
  outdir: ".build",
});

await builder.buildTypes();
