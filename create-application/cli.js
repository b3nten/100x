#!/usr/bin/env node

import { consola } from "consola";
import * as fs from "node:fs/promises";
import path from "node:path";
import { Logger, LogLevel, colors } from "@100x/engine/logging";

const logger = new Logger("100x", LogLevel.Info, colors.sunset);

if (import.meta.main) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.critical(error);
      process.exit(1);
    });
}

async function main() {
  logger.log("Creating 100x application");

  let name = await consola.prompt("Enter project name:");
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    logger.error("Project name is required");
    process.exit(1);
  }
  name = name.trim();
  const exists = await fileExists(path.join(process.cwd(), name));
  if (exists) {
    logger.error(`Directory ${name} already exists`);
    process.exit(1);
  }

  const usingReact = false;

  const target = await consola.prompt(
    "Choose a built target (this can be changed later):",
    {
      type: "select",
      options: Object.keys(targets),
      initial: "Node",
    },
  );

  console.log("");
  logger.info("Creating project...");

  await fs.mkdir(name, { recursive: true }).catch((error) => {
    logger.error(`Failed to create directory ${name}: ${error}`);
    process.exit(1);
  });
  await fs.mkdir(path.join(process.cwd(), name, "src"), { recursive: true });
  await fs.mkdir(path.join(process.cwd(), name, "src", "clientMain"), {
    recursive: true,
  });
  await fs.mkdir(path.join(process.cwd(), name, "src", "serverMain"), {
    recursive: true,
  });
  await fs.mkdir(
    path.join(process.cwd(), name, "src", "clientMain", "assets"),
    { recursive: true },
  );

  await fs.writeFile(path.join(process.cwd(), name, ".gitignore"), gitIgnore);

  await fs.writeFile(
    path.join(process.cwd(), name, "package.json"),
    packageJson(name, usingReact),
  );

  await fs.writeFile(
    path.join(process.cwd(), name, "app.config.ts"),
    config(target, usingReact),
  );

  await fs.writeFile(path.join(process.cwd(), name, "tsconfig.json"), tsconfig);

  await fs.writeFile(
    path.join(process.cwd(), name, "src", "clientMain", "assets", "styles.css"),
    styles,
  );

  await fs.writeFile(
    path.join(process.cwd(), name, "src", "clientMain", "main.ts"),
    clientMain,
  );

  await fs.writeFile(
    path.join(process.cwd(), name, "src", "serverMain", "main.ts"),
    serverMain,
  );

  logger.success(`Application ${name} created successfully`);
  logger.info("To get started:");
  console.log(`  cd ${name}`);
  console.log(`  npm install`);
  console.log("  npm run dev");
}

const gitIgnore = `
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*
node_modules
dist
dist-ssr
*.local
.output
.wrangler
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
`;

const packageJson = (name, usingReact) => `{
  "name": "${name}",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "application dev",
    "build": "application build"
  },
  "dependencies": {
    "@100x/application": "^0.0.8",
    "@100x/engine": "^0.0.3",
    "typescript": "^5.9.3",
    "hono": "^4.10.2"
  }
}
`;

const config = (
  target,
) => `import { Application, BuildTargets } from "@100x/application";

export default Application(({ buildFor, clientEntry, serverEntry }) => {
  buildFor(BuildTargets.${target});
  clientEntry("src/clientMain/main");
  serverEntry("src/serverMain/main");
});`;

const tsconfig = `{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,

    "types": ["@100x/application/client"],
    "paths": {
      "~/clientMain/*": ["./src/clientMain/*"],
      "~/serverMain/*": ["./src/serverMain/*"],
    }
  },
}`;

const styles = `body {
	font-family: sans-serif;
}`;

const clientMain = `import "~/clientMain/assets/styles.css"

console.log("Hello from clientMain!")
`;

const serverMain = `import { clientEntry } from "@100x/application/server";
import { Hono } from 'hono'

const app = new Hono()

app.get("/api/ping", c => c.text("pong"))

app.get("*", c => c.html(\`
  <!DOCTYPE html>
  <head>
  \${clientEntry.css.map(href => \`<link rel="stylesheet" href="\${href}">\`).join("\\n")}
	  <script type="module" src="\${clientEntry.file}"></script>
	</head>
	<body>
	  <h1>Hello World!</h1>
		<p>Welcome to 100x!</p>
	</body>
	</html>
\`))

export default app.fetch;
`;

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const targets = {
  Node: "Node",
  Cloudflare: "Cloudflare",
};
