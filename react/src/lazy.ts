import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import * as p from "node:path";
import process from "node:process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { applicationPlugin } from "@100x/application";

export function resolveUnknownExtension(
  path: string | undefined | null,
  ext: string[] = [".ts", ".js", ".tsx", ".jsx"],
): string | null {
  if (!path) return null;
  if (ext.some((e) => path.endsWith(e))) return path;
  for (const e of ext) {
    if (existsSync(path + e)) return path + e;
  }
  return null;
}

const lazyRoutes = applicationPlugin(({ vitePlugin, virtualFile }) => {
  const routesToImports: Record<string, Set<string>> = {};

  let lazyRoutes = `export default {}`;
  virtualFile("lazy-routes", () => {
    try {
      const file = readFileSync(
        "./dist/public/.vite/lazyImports.json",
        "utf-8",
      );
      if (file) {
        lazyRoutes = `export default ${file}`;
      }
      return lazyRoutes;
    } catch (e) {
      return lazyRoutes;
    }
  });

  vitePlugin({
    name: "lazy-component-parser",
    transform(code, id) {
      try {
        if (!id.startsWith(process.cwd()) || !code.includes("LazyRoute"))
          return null;

        const cwd = process.cwd();
        const relativeFilePath = p.relative(cwd, id);

        const ast = parse(code, {
          sourceType: "module",
          plugins: [
            "typescript",
            "jsx",
            "decorators",
            ["@babel/plugin-proposal-decorators", { version: "2023-05" }],
          ],
        });

        const lazyComponents: string[] = [];

        traverse.default(ast, {
          CallExpression(path) {
            if (
              t.isIdentifier(path.node.arguments[0]) &&
              path.node.arguments[0].name === "LazyRoute" &&
              t.isObjectExpression(path.node.arguments[1]) &&
              path.node.arguments[1].properties.some(
                (p) =>
                  t.isObjectProperty(p) &&
                  t.isIdentifier(p.key) &&
                  p.key.name === "match",
              )
            ) {
              const match = path.node.arguments[1].properties.find(
                (p) =>
                  t.isObjectProperty(p) &&
                  t.isIdentifier(p.key) &&
                  p.key.name === "match",
              );
              const importProp = path.node.arguments[1].properties.find(
                (p) =>
                  t.isObjectProperty(p) &&
                  t.isIdentifier(p.key) &&
                  p.key.name === "import",
              );
              if (match && importProp) {
                const matchPath = getPathOfMemberExpression(match.value);
                let importPath = importProp.value.body.arguments[0].value;
                if (importPath.startsWith(".")) {
                  let resolvedImportPath = resolveUnknownExtension(
                    p.join(p.dirname(relativeFilePath), importPath),
                  );
                  if (!resolvedImportPath) return null;
                  routesToImports[matchPath.join(".")] ??= new Set();
                  routesToImports[matchPath.join(".")]!.add(resolvedImportPath);
                }
                importProp.value = t.stringLiteral(importPath);
                lazyComponents.push(importPath);
              }
            }
          },
        });

        if (lazyComponents.length === 0) return null;

        const transformed =
          generate.default(ast).code +
          `
globalThis.__lazyComponentImports ??= new Map;
globalThis.__lazyComponentPromises ??= new Map;
${lazyComponents.map((c) => `if(!__lazyComponentImports.has("${c}")) __lazyComponentImports.set("${c}", () => import("${c}"));`).join("\n")}
				`;
        return {
          code: transformed,
          map: null,
        };
      } catch (e) {
        return null;
      }
    },
    buildEnd() {
      mkdirSync("./dist/public/.vite", { recursive: true });
      writeFileSync(
        "./dist/public/.vite/lazyImports.json",
        `{
	${Object.entries(routesToImports)
    .map(
      ([path, imports]) =>
        `"${path}": [${Array.from(imports)
          .map((i) => `"${i}"`)
          .join(", ")}]`,
    )
    .join(",\n\t\t")}
}`,
      );
    },
  });
});

export default lazyRoutes;

const getPathOfMemberExpression = (node: t.MemberExpression): string[] => {
  const path: string[] = [];

  let current: t.Node = node;

  while (t.isMemberExpression(current)) {
    if (current.computed) {
      // For computed properties like obj[expr], you might want to handle this
      // For now, we'll skip or you can extract the computed value
      break;
    }

    if (t.isIdentifier(current.property)) {
      path.unshift(current.property.name);
    }

    current = current.object;
  }

  // Add the final identifier (the root object)
  if (t.isIdentifier(current)) {
    path.unshift(current.name);
  }

  return path.slice(1);
};
