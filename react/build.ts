import { Builder, keepStructurePlugin } from "../builder";
import fs from "node:fs";

const builder = new Builder({
  entryPoints: ["src/**/*.ts"],
  external: ["./src/runtimes/clientDev.ts"],
  bundle: true,
  format: "esm",
  target: ["es2022"],
  plugins: [keepStructurePlugin],
});

builder.cleanOutputDir(".build");

await builder.build({
  outdir: ".build",
});

await builder.buildTypes();

fs.copyFileSync("./src/types.d.ts", ".build/types.d.ts");
