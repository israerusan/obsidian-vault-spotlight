export function normalizeTag(raw) {
	return String(raw ?? "").replace(/^#/, "").trim().replace(/\s+/g, "-");
}

export function applyTagToMarkdown(markdown, rawTag) {
	const tag = normalizeTag(rawTag);
	if (!tag) return markdown;
	const content = String(markdown ?? "");
	if (frontmatterHasTag(content, tag) || new RegExp(`(^|\\s)#${escapeRegExp(tag)}(\\s|$)`).test(content)) return content;
	const fm = parseFrontmatter(content);
	if (!fm) return `---\ntags: [${tag}]\n---\n${content}`;
	const lines = fm.body.split("\n");
	const tagLineIndex = lines.findIndex((line) => /^tags\s*:/.test(line.trim()));
	if (tagLineIndex === -1) lines.push(`tags: [${tag}]`);
	else lines[tagLineIndex] = appendTagToLine(lines[tagLineIndex], tag);
	return `---\n${lines.join("\n")}\n---${fm.rest}`;
}

export function removeTagFromMarkdown(markdown, rawTag) {
	const tag = normalizeTag(rawTag);
	if (!tag) return markdown;
	let content = String(markdown ?? "");
	const fm = parseFrontmatter(content);
	if (fm) {
		const lines = fm.body.split("\n").map((line) => /^tags\s*:/.test(line.trim()) ? removeTagFromLine(line, tag) : line).filter((line) => line.trim() !== "tags: []");
		content = `---\n${lines.join("\n")}\n---${fm.rest}`;
	}
	return content.replace(new RegExp(`(^|\\s)#${escapeRegExp(tag)}(?=\\s|$)`, "g"), (m, lead) => lead || "").replace(/[ \t]+\n/g, "\n");
}

export function setFrontmatterProperty(markdown, key, value) {
	const cleanKey = String(key || "").trim();
	if (!cleanKey) return markdown;
	const line = `${cleanKey}: ${formatYamlScalar(value)}`;
	const content = String(markdown ?? "");
	const fm = parseFrontmatter(content);
	if (!fm) return `---\n${line}\n---\n${content}`;
	const lines = fm.body.split("\n");
	const idx = lines.findIndex((existing) => existing.split(":", 1)[0].trim().toLowerCase() === cleanKey.toLowerCase());
	if (idx === -1) lines.push(line);
	else lines[idx] = line;
	return `---\n${lines.join("\n")}\n---${fm.rest}`;
}

function frontmatterHasTag(content, tag) {
	const fm = parseFrontmatter(content);
	if (!fm) return false;
	const line = fm.body.split("\n").find((entry) => /^tags\s*:/.test(entry.trim()));
	return line ? tagValuesFromLine(line).includes(tag) : false;
}

function parseFrontmatter(content) {
	if (!content.startsWith("---\n")) return null;
	const close = content.indexOf("\n---", 4);
	if (close === -1) return null;
	return { body: content.slice(4, close), rest: content.slice(close + 4) };
}

function appendTagToLine(line, tag) {
	const tags = tagValuesFromLine(line);
	if (!tags.includes(tag)) tags.push(tag);
	return `${line.split(":", 1)[0]}: [${tags.join(", ")}]`;
}

function removeTagFromLine(line, tag) {
	const tags = tagValuesFromLine(line).filter((entry) => entry !== tag);
	return `${line.split(":", 1)[0]}: [${tags.join(", ")}]`;
}

function tagValuesFromLine(line) {
	const raw = line.split(":").slice(1).join(":").trim();
	const inner = raw.startsWith("[") && raw.endsWith("]") ? raw.slice(1, -1) : raw;
	return inner.split(/[ ,]+/).map((s) => s.replace(/^#/, "").trim()).filter(Boolean);
}

function formatYamlScalar(value) {
	const text = String(value ?? "").trim();
	return /^[A-Za-z0-9_./@-]+$/.test(text) ? text : JSON.stringify(text);
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
