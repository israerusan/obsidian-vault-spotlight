export function normalizeTag(raw) {
	return String(raw ?? "").replace(/^#/, "").trim().replace(/\s+/g, "-");
}

/**
 * Frontmatter `tags` values arrive in several shapes: missing, a single
 * string ("work"), a comma-joined string ("work, client"), or an array
 * (inline or block style — YAML parsing has already flattened both).
 * Normalize them all to a clean string array.
 */
export function tagsValueToList(value) {
	if (value === null || value === undefined) return [];
	const entries = Array.isArray(value) ? value : String(value).split(",");
	return entries
		.map((entry) => normalizeTag(entry))
		.filter(Boolean);
}

/**
 * Returns the tags list with `rawTag` appended, or the unchanged list when it
 * is already present (case-insensitive). Meant to be used inside
 * `app.fileManager.processFrontMatter`, which handles YAML serialization —
 * never edit frontmatter text by hand (block-style lists would be corrupted).
 */
export function addTagToTags(value, rawTag) {
	const tag = normalizeTag(rawTag);
	const list = tagsValueToList(value);
	if (!tag || list.some((entry) => entry.toLowerCase() === tag.toLowerCase())) return list;
	return [...list, tag];
}

/**
 * Returns the tags list without `rawTag` (case-insensitive), or `null` when
 * the removal empties the list — the caller should delete the property.
 */
export function removeTagFromTags(value, rawTag) {
	const tag = normalizeTag(rawTag).toLowerCase();
	const list = tagsValueToList(value).filter((entry) => entry.toLowerCase() !== tag);
	return list.length > 0 ? list : null;
}

/** Strip inline `#tag` occurrences from note text (word-boundary aware). */
export function removeInlineTag(markdown, rawTag) {
	const tag = normalizeTag(rawTag);
	if (!tag) return markdown;
	return String(markdown ?? "")
		.replace(new RegExp(`(^|\\s)#${escapeRegExp(tag)}(?=\\s|$)`, "g"), (m, lead) => lead || "")
		.replace(/[ \t]+\n/g, "\n");
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
