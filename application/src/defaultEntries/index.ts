import { resolveThisDir } from "../utils.ts";
import path from "node:path";

export const virtualDirectory = resolveThisDir(import.meta.url);

export const defaultEntries = {
  server: path.join(virtualDirectory, "defaultServer"),
  client: path.join(virtualDirectory, "defaultClient"),
};
