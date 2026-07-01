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

	search(query: string, options: { excludeFolders?: string[]; limit?: number } = {}): HeadingResult[] {
		const limit = options.limit ?? 50;
		const excluded = normalizeExcludeFolders(options.excludeFolders);
		const q = query.trim();
		const results: HeadingResult[] = [];

		for (const file of this.app.vault.getMarkdownFiles()) {
			if (isPathExcluded(file.path, excluded)) continue;
			const cache = this.app.metadataCache.getFileCache(file);
			const headings = cache?.headings;
			if (!headings || headings.length === 0) continue;

			for (const h of headings) {
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
			}
		}

		return results.sort((a, b) => b.score - a.score).slice(0, limit);
	}
}
