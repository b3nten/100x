import {Builder, keepStructurePlugin, logger} from "../builder";
import fs from "node:fs";

const builder = new Builder({
    entryPoints: ["src/**/*.ts"],
    bundle: true,
    outdir: ".build",
    format: "esm",
    platform: "node",
    treeShaking: true,
    target: ["es2022"],
    plugins: [keepStructurePlugin],
})

builder.cleanOutputDir("dist");

await builder.build({})

await builder.buildTypes();

logger.info('Cleaning up type declarations...')
fs.copyFileSync("./src/server.d.ts", "./.build/server.d.ts")
fs.rmSync("./.build/server.d.js")
fs.copyFileSync("./src/client.d.ts", "./.build/client.d.ts")
fs.rmSync("./.build/client.d.js")
fs.copyFileSync("./src/entries.d.ts", "./.build/entries.d.ts")
fs.rmSync("./.build/entries.d.js")
logger.success('Cleaned up type declarations successfully.')
logger.success('Build process completed successfully.')

