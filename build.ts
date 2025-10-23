import { spawn } from "node:child_process";
import { logger } from "./builder";
import path from "node:path";
import process from "node:process";

async function build(pkg: string) {
  return new Promise((resolve) => {
    const childProcess = spawn("pnpm", ["build"], {
      cwd: path.join(process.cwd(), pkg),
    });
    childProcess.on("exit", (code) => {
      if (code === 0) {
        logger.success(`Built ${pkg} successfully`);
        resolve(void 0);
      } else {
        logger.warn(`Errors occurred building ${pkg}`);
        resolve(void 1);
      }
    });
    childProcess.on("error", (err) => {
      logger.error(err.message);
    });
  });
}

logger.info("Starting build process");

await Promise.all([
  build("engine"),
  build("react"),
  build("application"),
  build("router"),
])
  .then(() => {
    logger.success("All packages built successfully");
  })
  .catch((err) => {
    logger.error(err.message);
  });
