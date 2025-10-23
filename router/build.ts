import {Builder, keepStructurePlugin} from "../builder";

const builder = new Builder({
    entryPoints: ["src/**/*.ts"],
    bundle: true,
    format: "esm",
    target: ["es2022"],
    plugins: [keepStructurePlugin],
});

builder.cleanOutputDir(".build");

await builder.build(
    {
        outdir: ".build",
    },
);

await builder.buildTypes();