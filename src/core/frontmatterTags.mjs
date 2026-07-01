export function normalizeTag(raw) {
	return String(raw ?? "").replace(/^#/, "").trim().replace(/\s+/g, "-");
}

export function applyTagToMarkdown(markdown, rawTag) {
	const tag = normalizeTag(rawTag);
	if (!tag) return markdown;
	const content = String(markdown ?? "");
	if (new RegExp(`(^|\\s)#${escapeRegExp(tag)}(\\s|$)`).test(content)) return content;

	const fm = parseFrontmatter(content);
	if (!fm) return `---\ntags: [${tag}]\n---\n${content}`;

	const lines = fm.body.split("\n");
	const tagLineIndex = lines.findIndex((line) => /^tags\s*:/.test(line.trim()));
	if (tagLineIndex === -1) {
		lines.push(`tags: [${tag}]`);
	} else {
		lines[tagLineIndex] = appendTagToLine(lines[tagLineIndex], tag);
	}
	return `---\n${lines.join("\n")}\n---${fm.rest}`;
}

function parseFrontmatter(content) {
	if (!content.startsWith("---\n")) return null;
	const close = content.indexOf("\n---", 4);
	if (close === -1) return null;
	return { body: content.slice(4, close), rest: content.slice(close + 4) };
}

function appendTagToLine(line, tag) {
	if (line.includes(`[`) && line.includes(`]`)) {
		return line.replace(/\[(.*)\]/, (_m, inner) => {
			const tags = inner.split(",").map((s) => s.trim()).filter(Boolean);
			if (!tags.includes(tag)) tags.push(tag);
			return `[${tags.join(", ")}]`;
		});
	}
	const parts = line.split(":");
	const existing = parts.slice(1).join(":").trim();
	if (!existing) return `${parts[0]}: [${tag}]`;
	const tags = existing.split(/\s+/).map((s) => s.replace(/^-\s*/, "").trim()).filter(Boolean);
	if (!tags.includes(tag)) tags.push(tag);
	return `${parts[0]}: [${tags.join(", ")}]`;
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
