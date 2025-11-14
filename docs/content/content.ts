const documentationContents = import.meta.glob<{ default: string }>("./**/*.html", {
	query: "?raw"
})

export async function getDocsFor(path: string): Promise<string> {
	path = `./${path}.html`
	if(!(path in documentationContents)) {
		throw new Error(`Documentation not found for path: ${path}`);
	}
	return (await documentationContents[path]()).default
}
