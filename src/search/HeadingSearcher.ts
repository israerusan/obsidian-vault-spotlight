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
		} = {}
	): HeadingResult[] {
		const limit = options.limit ?? 50;
		const excluded = normalizeExcludeFolders(options.excludeFolders);
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
			if (fileQuery && !fuzzyMatch(fileQuery, file.basename) && !fuzzyMatch(fileQuery, file.path)) continue;
			const cache = this.app.metadataCache.getFileCache(file);
			const headings = cache?.headings;
			if (!headings || headings.length === 0) continue;

			for (const h of headings) {
				if (options.levelMin != null && h.level < options.levelMin) continue;
				if (options.levelMax != null && h.level > options.levelMax) continue;
				let score = 1;
				let matchIndices: number[] = [];
				if (q.length > 0) {
					const match = fuzzyMatch(q, h.heading);
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
					results.sort((a, b) => b.score - a.score);
					results.length = limit;
				}
			}
		}

		return results.sort((a, b) => b.score - a.score).slice(0, limit);
	}
}
