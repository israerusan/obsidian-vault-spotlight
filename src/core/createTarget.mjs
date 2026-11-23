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
 * `hasFilters` says whether the query carried any filter fragment (`in:`, `#tag`,
 * `ext:`, `-word`, …). When it did, callers must name the note from `name` — the
 * raw query would leak the filter text into the filename, even when an `in:`
 * filter only partially matches a folder and so resolves to `folder: null`.
 *
 * @param {AdvancedQueryLike} parsed
 * @param {() => Iterable<string>} listFolderPaths
 * @returns {{ folder: string | null; name: string; hasFilters: boolean }}
 */
export function resolveCreateTarget(parsed, listFolderPaths) {
	// Plain words from EVERY OR alternative (`Roadmap OR #tag` → "Roadmap"); the flat
	// fields only mirror the first clause.
	const name = queryClauses(parsed)
		.flatMap((clause) => clause.textTokensRaw ?? [])
		.join(" ")
		.trim();
	const hasFilters = hasQueryFilters(parsed);
	// Route into a folder only when EVERY OR alternative names the same single
	// folder — `in:Projects a OR in:Archive b` is ambiguous, so the default location.
	const wanted = singleFolderAcrossClauses(queryClauses(parsed));
	if (!wanted) return { folder: null, name, hasFilters };
	for (const path of listFolderPaths()) {
		const normalized = normalizeFolder(path);
		if (normalized && normalized.toLowerCase() === wanted) return { folder: normalized, name, hasFilters };
	}
	return { folder: null, name, hasFilters };
}

/**
 * True when the parsed query holds any non-text filter. Missing fields (a partial
 * parse shape) count as "no filter" so the check never throws.
 * @param {AdvancedQueryLike} parsed
 */
export function hasQueryFilters(parsed) {
	return queryClauses(parsed).some(clauseHasFilters);
}

/** The one folder (lowercased, normalized) all clauses agree on, or "". */
function singleFolderAcrossClauses(clauses) {
	let wanted = null;
	for (const clause of clauses) {
		const includes = clause.folderIncludes ?? [];
		if (includes.length !== 1) return "";
		const folder = normalizeFolder(includes[0]).toLowerCase();
		if (!folder || (wanted !== null && folder !== wanted)) return "";
		wanted = folder;
	}
	return wanted ?? "";
}

/** The OR alternatives, or the query itself when it has none. */
function queryClauses(parsed) {
	return Array.isArray(parsed.orClauses) && parsed.orClauses.length > 0 ? parsed.orClauses : [parsed];
}

function clauseHasFilters(parsed) {
	const nonEmpty = (list) => Array.isArray(list) && list.length > 0;
	return (
		// Set by the parser for ANY consumed syntax token, including invalid/empty
		// values (`modified:bogus`, `ext:`, bare `#`) that leave no field populated.
		parsed.hasFilterTokens === true ||
		nonEmpty(parsed.folderIncludes) ||
		nonEmpty(parsed.pathTerms) ||
		nonEmpty(parsed.nameTerms) ||
		nonEmpty(parsed.tags) ||
		nonEmpty(parsed.properties) ||
		nonEmpty(parsed.extFilters) ||
		nonEmpty(parsed.exclusions) ||
		parsed.modifiedDays != null ||
		parsed.createdDays != null ||
		parsed.isStarred === true ||
		parsed.isBookmarked === true
	);
}

/**
 * @typedef {{ folderIncludes: string[]; textTokensRaw: string[]; pathTerms?: string[];
 *   nameTerms?: string[]; tags?: string[]; properties?: unknown[]; extFilters?: string[];
 *   exclusions?: string[]; modifiedDays?: number | null; createdDays?: number | null;
 *   isStarred?: boolean; isBookmarked?: boolean; hasFilterTokens?: boolean;
 *   orClauses?: AdvancedQueryLike[] | null }} AdvancedQueryLike
 */

/** Trim slashes/whitespace; the vault root ("/" or "") normalizes to "". */
export function normalizeFolder(path) {
	return String(path ?? "")
		.trim()
		.replace(/\\/g, "/")
		.replace(/^\/+|\/+$/g, "");
}
