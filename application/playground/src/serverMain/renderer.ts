import { defineRenderHandler, clientEntry } from "@100x/application/server";

export default defineRenderHandler((_ctx) => ({
	body: template,
	headers: {
		"content-type": "text/html",
	}
}))

const template = `
<!DOCTYPE html>
<head>
	${clientEntry.css.map(href => `<link rel="stylesheet" href="${href}">`).join("\n")}
	<script type="module" src="${clientEntry.file}"></script>
</head>
<body>
	<h1>Hello World!</h1>
</body>
</html>
`
