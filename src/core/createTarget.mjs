// Where a "create note from the query" lands. Pure: the caller supplies the
// vault's folder paths lazily, so the scan only happens when the query actually
// carries an `in:` filter.

/**
 * Resolve the target folder + note name for a query parsed by parseAdvancedQuery.
 *
 * A single `in:<folder>` filter that names an existing folder exactly
 * (case-insensitively — the parser lowercases filter values) routes the new note
 * into that folder, and the name is built from the plain words only so the
 * `in:"…"` fragment never leaks into the filename. Anything else (no `in:`,
 * several, or one that only partially matches a path) returns `folder: null` and
 * the caller keeps its default new-note location.
 *
 * @param {{ folderIncludes: string[]; textTokensRaw: string[] }} parsed
 * @param {() => Iterable<string>} listFolderPaths
 * @returns {{ folder: string | null; name: string }}
 */
export function resolveCreateTarget(parsed, listFolderPaths) {
	const name = parsed.textTokensRaw.join(" ").trim();
	if (parsed.folderIncludes.length !== 1) return { folder: null, name };
	const wanted = normalizeFolder(parsed.folderIncludes[0]).toLowerCase();
	if (!wanted) return { folder: null, name };
	for (const path of listFolderPaths()) {
		const normalized = normalizeFolder(path);
		if (normalized && normalized.toLowerCase() === wanted) return { folder: normalized, name };
	}
	return { folder: null, name };
}

/** Trim slashes/whitespace; the vault root ("/" or "") normalizes to "". */
export function normalizeFolder(path) {
	return String(path ?? "")
		.trim()
		.replace(/\\/g, "/")
		.replace(/^\/+|\/+$/g, "");
}
