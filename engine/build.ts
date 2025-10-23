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
        dropLabels: ["ELYSIA_PROD"],
        outdir: ".build/instrument",
    },
    {
        dropLabels: ["ELYSIA_PROD", "ELYSIA_INSTRUMENT"],
        outdir: ".build/dev",
    },
    {
        dropLabels: ["ELYSIA_DEV", "ELYSIA_INSTRUMENT"],
        outdir: ".build/prod",
    }
);

await builder.buildTypes();