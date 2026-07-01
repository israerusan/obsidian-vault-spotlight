export function buildResultMarkdown(rows) {
	return rows
		.map((row) => `${row.prefix ?? "- "}${row.link}${row.suffix ?? ""}`)
		.filter((line) => line.trim().length > 0)
		.join("\n");
}

export function buildMocMarkdown(rows, options = {}) {
	const title = options.title || "Vault Spotlight MOC";
	const groupBy = options.groupBy || "none";
	const includeSnippets = options.includeSnippets === true;
	const groups = new Map();
	for (const row of rows) {
		const key = groupKey(row, groupBy);
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key).push(row);
	}
	const lines = [`# ${title}`, ""];
	for (const [group, items] of groups) {
		if (groupBy !== "none") lines.push(`## ${group}`, "");
		for (const row of items) {
			const suffix = includeSnippets && row.snippet ? ` — ${row.snippet}` : row.suffix || "";
			lines.push(`- ${row.link}${suffix}`);
		}
		lines.push("");
	}
	return lines.join("\n").trimEnd() + "\n";
}

function groupKey(row, groupBy) {
	if (groupBy === "folder") return row.folder || "/";
	if (groupBy === "tag") return row.tags?.[0] || "Untagged";
	if (groupBy === "property") return row.property || "Uncategorized";
	return "Results";
}
