export function buildResultMarkdown(rows) {
	return rows
		.map((row) => `${row.prefix ?? "- "}${row.link}${row.suffix ?? ""}`)
		.filter((line) => line.trim().length > 0)
		.join("\n");
}
