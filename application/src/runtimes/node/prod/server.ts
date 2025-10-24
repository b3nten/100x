import { createServer } from "node:http";
import serverEntry from "@100x/application/serverEntry";
import { fileURLToPath } from "node:url";
import sirv from "sirv";
import { createRequestListener } from "@remix-run/node-fetch-server";
import { dirname, join } from "node:path";

export const webHandler = async (request: Request) => {
  let response = await serverEntry(request);
  if (response instanceof Response) {
    return response;
  }
  return new Response("Internal Server Error", {
    status: 500,
    headers: {
      "Content-Type": "text/plain",
    },
  });
};

export const nodeHandler = createRequestListener(webHandler);

async function main() {
  const thisDir = dirname(fileURLToPath(import.meta.url));

  const immutablesHandler = sirv(join(thisDir, "public"), {
    immutable: true,
    maxAge: 31536000,
    dev: false,
  });

  const publicHandler = sirv(join(thisDir, "public"), {
    maxAge: 0,
    dev: false,
    etag: true,
  });

  const httpServer = createServer((req, res) => {
    if (req.url?.startsWith("/immutable/")) {
      immutablesHandler(req, res, () => {
        nodeHandler(req, res);
      });
    } else {
      publicHandler(req, res, () => {
        nodeHandler(req, res);
      });
    }
  });

  const port = process.argv[2] ?? 8000;

  httpServer.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

let isEntry = [process.argv[1], process.argv[1] + ".js"].some(
  (s) => s === fileURLToPath(import.meta.url),
);

if (isEntry) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
