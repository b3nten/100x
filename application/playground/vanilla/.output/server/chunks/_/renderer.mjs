import { d as defineRenderHandler, r as resolveEntry, c as clientEntry } from "../../index.mjs";
import "node:http";
import "node:https";
import "nitro/h3";
import "node:fs";
import "node:url";
import "node:path";
const entry = resolveEntry(clientEntry);
const rendererMain = defineRenderHandler(async (ctx) => {
  return {
    body: template,
    headers: {
      "content-type": "text/html"
    }
  };
});
const template = `
<!DOCTYPE html>
<head>
	${entry.css ? entry.css?.map((c) => `<link rel="stylesheet" href="${c}">`).join("\n") : ""}
	<script type="module" src="${entry.file}"><\/script>
</head>
<body>
	<h1>Hello World!</h1>
</body>
</html>
`;
export {
  rendererMain as default
};
