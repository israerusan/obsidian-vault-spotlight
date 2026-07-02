import { App, TFile } from "obsidian";
import { fuzzyMatch } from "./fuzzy";
import {
	collectFileTags,
	fileMatchesTags,
	frontmatterValueMatches,
	getFrontmatterValue,
} from "./metadata";
import { getSearchableFiles, getVaultFileKind, type VaultFileKind } from "./vaultFiles";
import { aliasMatches as frontmatterAliasMatches } from "../core/fileAliases.mjs";

export interface FileSearchResult {
	file: TFile;
	score: number;
	matchIndices: number[];
	modifiedLabel: string;
	fileKind: VaultFileKind;
	isRecent: boolean;
	isStarred: boolean;
	isBookmarked: boolean;
}

export interface FrecencyEntry {
	count: number;
	last: number;
}

export interface FileSearchOptions {
	textTokens: string[];
	phrases?: string[];
	exclusions?: string[];
	folderIncludes?: string[];
	pathTerms?: string[];
	nameTerms?: string[];
	tags: string[];
	properties: Array<{ key: string; value: string | null }>;
	extFilters: string[];
	isStarred?: boolean;
	isBookmarked?: boolean;
	modifiedDays?: number | null;
	createdDays?: number | null;
	recentPaths: string[];
	starredPaths: string[];
	bookmarkedPaths?: string[];
	/** Files currently open in an editor — boosted so open work ranks first. */
	openPaths?: Set<string>;
	includeCanvas: boolean;
	includePdf: boolean;
	excludeFolders?: string[];
	frecency?: Record<string, FrecencyEntry>;
	limit?: number;
}

export class FileSearcher {
	constructor(private app: App) {}

	async search(options: FileSearchOptions): Promise<FileSearchResult[]> {
		const files = getSearchableFiles(this.app, {
			includeCanvas: options.includeCanvas,
			includePdf: options.includePdf,
			excludeFolders: options.excludeFolders,
		});
		const limit = options.limit ?? 50;
		const results: FileSearchResult[] = [];
		const recentSet = new Map(options.recentPaths.map((p, i) => [p, i]));
		const starredSet = new Map(options.starredPaths.map((p, i) => [p, i]));
		const bookmarkedSet = new Set(options.bookmarkedPaths ?? []);
		const hasActiveFilters =
			options.tags.length > 0 || options.properties.length > 0 || options.extFilters.length > 0;
		const isBrowseMode = options.textTokens.length === 0 && !hasActiveFilters;
		const isFilterOnly = options.textTokens.length === 0 && hasActiveFilters;

		for (const file of files) {
			if (!this.matchesExtFilter(file, options.extFilters)) continue;
			if (!this.matchesAdvancedFileFilters(file, options, starredSet.has(file.path), bookmarkedSet.has(file.path))) continue;
			if (!this.matchesFilters(file, options)) continue;

			const basename = file.basename;
			let score = 0;
			let indices: number[] = [];

			if (isBrowseMode) {
				score = 1;
			} else if (isFilterOnly) {
				score = 100;
			} else {
				let matched = true;
				for (const token of [...(options.nameTerms ?? []), ...options.textTokens]) {
					const basenameMatch = fuzzyMatch(token, basename);
					if (basenameMatch) {
						score += basenameMatch.score;
						// Accumulate across tokens (was overwriting), and only keep
						// basename-relative indices so highlights land correctly.
						indices.push(...basenameMatch.indices);
						continue;
					}
					const pathMatch = fuzzyMatch(token, file.path);
					if (!pathMatch && !this.aliasMatches(file, token)) {
						matched = false;
						break;
					}
					// Matched on the folder path or frontmatter alias, not the name;
					// count it at a discount and add no indices.
					score += pathMatch ? Math.floor(pathMatch.score / 2) : 18;
				}
				if (!matched) score = 0;
			}

			if (score <= 0) continue;

			// Pinned-tier boost — mutually exclusive so browse sections stay
			// contiguous and correctly ordered: Starred > Bookmarks > Recent.
			const starredRank = starredSet.get(file.path);
			const recentRank = recentSet.get(file.path);
			if (starredRank !== undefined) {
				score += 3000 - starredRank * 10;
			} else if (bookmarkedSet.has(file.path)) {
				score += 2000;
			} else if (recentRank !== undefined) {
				score += 1000 - recentRank * 10;
			} else if (isBrowseMode) {
				score += Math.max(0, 100 - Math.floor((Date.now() - file.stat.mtime) / 3600000));
			} else {
				score += Math.max(0, 10 - Math.floor((Date.now() - file.stat.mtime) / 86400000));
			}

			// Already-open editors rank ahead of equally-relevant closed files,
			// without jumping the Starred/Bookmarks/Recent browse tiers.
			if (options.openPaths?.has(file.path)) score += 400;

			// Frecency: reward files opened often and recently. Strongest in
			// browse/filter modes where there is no query relevance to rank by.
			const fr = options.frecency?.[file.path];
			if (fr) {
				const freqBoost = Math.min(300, fr.count * 15);
				const ageDays = (Date.now() - fr.last) / 86400000;
				const recencyBoost = Math.max(0, 60 - Math.floor(ageDays) * 2);
				const weight = isBrowseMode || isFilterOnly ? 1 : 0.25;
				score += Math.floor((freqBoost + recencyBoost) * weight);
			}

			results.push({
				file,
				score,
				matchIndices: indices,
				modifiedLabel: formatRelativeTime(file.stat.mtime),
				fileKind: getVaultFileKind(file),
				isRecent: recentSet.has(file.path),
				isStarred: starredSet.has(file.path),
				isBookmarked: bookmarkedSet.has(file.path),
			});
		}

		return results.sort((a, b) => b.score - a.score).slice(0, limit);
	}

	private matchesExtFilter(file: TFile, extFilters: string[]): boolean {
		if (extFilters.length === 0) return true;
		return extFilters.includes(file.extension.toLowerCase());
	}

	private aliasMatches(file: TFile, token: string): boolean {
		if (file.extension !== "md") return false;
		const cache = this.app.metadataCache.getFileCache(file);
		return frontmatterAliasMatches(cache?.frontmatter ?? null, token);
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

	private matchesAdvancedFileFilters(file: TFile, options: FileSearchOptions, isStarred: boolean, isBookmarked: boolean): boolean {
		const lowerPath = file.path.toLowerCase();
		const lowerName = file.basename.toLowerCase();
		if (options.isStarred && !isStarred) return false;
		if (options.isBookmarked && !isBookmarked) return false;
		for (const folder of options.folderIncludes ?? []) {
			const normalized = folder.toLowerCase().replace(/\/$/, "");
			if (!lowerPath.startsWith(`${normalized}/`) && !lowerPath.includes(`/${normalized}/`)) return false;
		}
		for (const term of options.pathTerms ?? []) {
			if (!lowerPath.includes(term.toLowerCase())) return false;
		}
		for (const term of options.nameTerms ?? []) {
			if (!lowerName.includes(term.toLowerCase()) && !fuzzyMatch(term, lowerName)) return false;
		}
		for (const phrase of options.phrases ?? []) {
			if (!lowerPath.includes(phrase.toLowerCase())) return false;
		}
		for (const exclusion of options.exclusions ?? []) {
			if (lowerPath.includes(exclusion.toLowerCase())) return false;
		}
		if (options.modifiedDays !== null && options.modifiedDays !== undefined) {
			if (Date.now() - file.stat.mtime > options.modifiedDays * 86400000) return false;
		}
		if (options.createdDays !== null && options.createdDays !== undefined) {
			if (Date.now() - file.stat.ctime > options.createdDays * 86400000) return false;
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