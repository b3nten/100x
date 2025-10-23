import { dirname, join } from "path";
import { fileURLToPath } from "url";

const thisDir = dirname(fileURLToPath(import.meta.url));

export const runtimes = {
  clientDev: join(thisDir, "clientDev"),
};
