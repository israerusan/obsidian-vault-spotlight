import { App, TFile } from "obsidian";
import { fuzzyMatch } from "./fuzzy";
import {
	collectFileTags,
	fileMatchesTags,
	frontmatterValueMatches,
	getFrontmatterValue,
} from "./metadata";
import { getSearchableFiles, getVaultFileKind, type VaultFileKind } from "./vaultFiles";

export interface FileSearchResult {
	file: TFile;
	score: number;
	matchIndices: number[];
	modifiedLabel: string;
	fileKind: VaultFileKind;
	isRecent: boolean;
	isStarred: boolean;
}

export interface FileSearchOptions {
	textTokens: string[];
	tags: string[];
	properties: Array<{ key: string; value: string | null }>;
	extFilters: string[];
	recentPaths: string[];
	starredPaths: string[];
	includeCanvas: boolean;
	includePdf: boolean;
	limit?: number;
}

export class FileSearcher {
	constructor(private app: App) {}

	async search(options: FileSearchOptions): Promise<FileSearchResult[]> {
		const files = getSearchableFiles(this.app, {
			includeCanvas: options.includeCanvas,
			includePdf: options.includePdf,
		});
		const limit = options.limit ?? 50;
		const results: FileSearchResult[] = [];
		const recentSet = new Map(options.recentPaths.map((p, i) => [p, i]));
		const starredSet = new Map(options.starredPaths.map((p, i) => [p, i]));
		const hasActiveFilters =
			options.tags.length > 0 || options.properties.length > 0 || options.extFilters.length > 0;
		const isBrowseMode = options.textTokens.length === 0 && !hasActiveFilters;
		const isFilterOnly = options.textTokens.length === 0 && hasActiveFilters;

		for (const file of files) {
			if (!this.matchesExtFilter(file, options.extFilters)) continue;
			if (!this.matchesFilters(file, options)) continue;

			const basename = file.basename;
			let score = 0;
			let indices: number[] = [];

			if (isBrowseMode) {
				score = 1;
			} else if (isFilterOnly) {
				score = 100;
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

			const starredRank = starredSet.get(file.path);
			if (starredRank !== undefined) {
				score += 2000 - starredRank * 10;
			}

			const recentRank = recentSet.get(file.path);
			if (recentRank !== undefined) {
				score += 1000 - recentRank * 10;
			} else if (isBrowseMode) {
				score += Math.max(0, 100 - Math.floor((Date.now() - file.stat.mtime) / 3600000));
			} else {
				score += Math.max(0, 10 - Math.floor((Date.now() - file.stat.mtime) / 86400000));
			}

			results.push({
				file,
				score,
				matchIndices: indices,
				modifiedLabel: formatRelativeTime(file.stat.mtime),
				fileKind: getVaultFileKind(file),
				isRecent: recentSet.has(file.path),
				isStarred: starredSet.has(file.path),
			});
		}

		return results.sort((a, b) => b.score - a.score).slice(0, limit);
	}

	private matchesExtFilter(file: TFile, extFilters: string[]): boolean {
		if (extFilters.length === 0) return true;
		return extFilters.includes(file.extension.toLowerCase());
	}

	private matchesFilters(file: TFile, options: FileSearchOptions): boolean {
		if (file.extension !== "md") {
			return options.tags.length === 0 && options.properties.length === 0;
		}

		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache) return options.tags.length === 0 && options.properties.length === 0;

		if (options.tags.length > 0) {
			const tags = collectFileTags(cache);
			if (!fileMatchesTags(tags, options.tags)) return false;
		}

		for (const prop of options.properties) {
			const fm = cache.frontmatter as Record<string, unknown> | null | undefined;
			if (!fm) return false;
			const raw = getFrontmatterValue(fm, prop.key);
			if (!frontmatterValueMatches(raw, prop.value)) return false;
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