import { App, TFile, getAllTags } from "obsidian";
import { fuzzyMatch } from "./fuzzy";

export interface FileSearchResult {
	file: TFile;
	score: number;
	matchIndices: number[];
	modifiedLabel: string;
}

export interface FileSearchOptions {
	textTokens: string[];
	tags: string[];
	properties: Array<{ key: string; value: string | null }>;
	recentPaths: string[];
	limit?: number;
}

export class FileSearcher {
	constructor(private app: App) {}

	async search(options: FileSearchOptions): Promise<FileSearchResult[]> {
		const files = this.app.vault.getMarkdownFiles();
		const cache = this.app.metadataCache;
		const limit = options.limit ?? 50;
		const results: FileSearchResult[] = [];
		const recentSet = new Map(options.recentPaths.map((p, i) => [p, i]));

		for (const file of files) {
			if (!(await this.matchesFilters(file, options))) continue;

			const basename = file.basename;
			let score = 0;
			let indices: number[] = [];

			if (options.textTokens.length === 0) {
				score = 1;
			} else {
				for (const token of options.textTokens) {
					const match = fuzzyMatch(token, basename) ?? fuzzyMatch(token, file.path);
					if (!match) {
						score = 0;
						break;
					}
					score += match.score;
					indices = match.indices;
				}
			}

			if (score <= 0) continue;

			const recentRank = recentSet.get(file.path);
			if (recentRank !== undefined) {
				score += 50 - recentRank;
			}

			score += Math.max(0, 10 - Math.floor((Date.now() - file.stat.mtime) / 86400000));

			results.push({
				file,
				score,
				matchIndices: indices,
				modifiedLabel: formatRelativeTime(file.stat.mtime),
			});
		}

		return results.sort((a, b) => b.score - a.score).slice(0, limit);
	}

	private async matchesFilters(file: TFile, options: FileSearchOptions): Promise<boolean> {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache) return options.tags.length === 0 && options.properties.length === 0;

		if (options.tags.length > 0) {
			const tags = new Set(getAllTags(cache).map((t) => t.toLowerCase()));
			for (const tag of options.tags) {
				if (!tags.has(tag)) return false;
			}
		}

		for (const prop of options.properties) {
			const fm = cache.frontmatter ?? {};
			const raw = fm[prop.key];
			if (raw === undefined || raw === null) return false;
			const value = String(raw).toLowerCase();
			if (prop.value === null) continue;
			if (!value.includes(prop.value)) return false;
		}

		return true;
	}
}

function formatRelativeTime(mtime: number): string {
	const diff = Date.now() - mtime;
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return new Date(mtime).toLocaleDateString();
}