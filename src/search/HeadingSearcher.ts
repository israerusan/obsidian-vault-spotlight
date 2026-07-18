import { App, TFile } from "obsidian";
import { fuzzyMatch } from "./fuzzy";
import { isPathExcluded, normalizeExcludeFolders } from "./vaultFiles";

export interface HeadingResult {
	file: TFile;
	heading: string;
	level: number;
	line: number;
	score: number;
	matchIndices: number[];
}

/**
 * Total order for headings: score desc, then (path, line) — which is unique per
 * heading. Mirrors ContentSearcher's compareContentRows so the soft-cap prune and
 * the final sort don't depend on getMarkdownFiles() iteration order when many
 * headings tie on score (a broad 1–2 char query, or the empty-query outline where
 * every heading scores 1).
 */
function compareHeadingRows(a: HeadingResult, b: HeadingResult): number {
	if (b.score !== a.score) return b.score - a.score;
	if (a.file.path !== b.file.path) return a.file.path < b.file.path ? -1 : 1;
	return a.line - b.line;
}

export class HeadingSearcher {
	constructor(private app: App) {}

	search(
		query: string,
		options: {
			excludeFolders?: string[];
			limit?: number;
			/** Restrict to files whose name fuzzy-matches (the `file#heading` syntax). */
			fileQuery?: string;
			levelMin?: number | null;
			levelMax?: number | null;
			/** Fold accents when matching (honors the ranking "ignore diacritics" setting). */
			ignoreDiacritics?: boolean;
		} = {}
	): HeadingResult[] {
		const limit = options.limit ?? 50;
		const excluded = normalizeExcludeFolders(options.excludeFolders);
		const matchOpts = { ignoreDiacritics: options.ignoreDiacritics === true };
		const q = query.trim();
		const fileQuery = options.fileQuery?.trim() ?? "";
		const results: HeadingResult[] = [];
		// Bound the working set the same way the content searchers do: a broad
		// 1–2 char query on a heading-dense vault would otherwise collect every
		// matching heading before slicing. Anything past the cap scored below all
		// kept rows, so pruning to the top `limit` yields an identical final list.
		const softCap = Math.max(limit * 10, 500);

		for (const file of this.app.vault.getMarkdownFiles()) {
			if (isPathExcluded(file.path, excluded)) continue;
			if (fileQuery && !fuzzyMatch(fileQuery, file.basename, matchOpts) && !fuzzyMatch(fileQuery, file.path, matchOpts)) continue;
			const cache = this.app.metadataCache.getFileCache(file);
			const headings = cache?.headings;
			if (!headings || headings.length === 0) continue;

			for (const h of headings) {
				if (options.levelMin != null && h.level < options.levelMin) continue;
				if (options.levelMax != null && h.level > options.levelMax) continue;
				let score = 1;
				let matchIndices: number[] = [];
				if (q.length > 0) {
					const match = fuzzyMatch(q, h.heading, matchOpts);
					if (!match) continue;
					score = match.score;
					matchIndices = match.indices;
				}
				results.push({
					file,
					heading: h.heading,
					level: h.level,
					line: h.position.start.line + 1,
					score,
					matchIndices,
				});
				if (results.length >= softCap) {
					results.sort(compareHeadingRows);
					results.length = limit;
				}
			}
		}

		return results.sort(compareHeadingRows).slice(0, limit);
	}
}
