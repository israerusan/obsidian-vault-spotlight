import { App, TFile } from "obsidian";
import { fuzzyMatch } from "./fuzzy";
import {
	collectFileTags,
	fileMatchesTags,
	frontmatterValueMatches,
	getFrontmatterValue,
} from "./metadata";
import { getSearchableFiles, getVaultFileKind, type VaultFileKind } from "./vaultFiles";
import { aliasMatches as frontmatterAliasMatches, extractAliases } from "../core/fileAliases.mjs";
import { normalizeRankingSettings, rankingBoosts, resolveRankingMode, type RankingSettings } from "../core/ranking.mjs";
import type { AdvancedQueryClause } from "../core/advancedQuery.mjs";

export interface FileSearchResult {
	file: TFile;
	score: number;
	matchIndices: number[];
	modifiedLabel: string;
	fileKind: VaultFileKind;
	primaryMatch: "filename" | "path" | "alias" | "filters" | "browse";
	aliasMatched: boolean;
	tags: string[];
	aliases: string[];
	isRecent: boolean;
	isStarred: boolean;
	isBookmarked: boolean;
}

export interface FrecencyEntry {
	count: number;
	last: number;
}

/** The cheap-to-compute fields captured during the scan, before the top-N slice. */
interface ScanRow {
	file: TFile;
	score: number;
	matchIndices: number[];
	primaryMatch: FileSearchResult["primaryMatch"];
	aliasMatched: boolean;
}

/**
 * The per-alternative field set an OR query iterates over. A no-OR search is a
 * single clause built straight from the flat options, so FileSearchOptions
 * structurally satisfies this and the single-clause path stays identical to the
 * pre-OR behavior.
 */
type FileSearchClause = Pick<
	FileSearchOptions,
	| "textTokens"
	| "phrases"
	| "exclusions"
	| "folderIncludes"
	| "pathTerms"
	| "nameTerms"
	| "tags"
	| "properties"
	| "extFilters"
	| "isStarred"
	| "isBookmarked"
	| "modifiedDays"
	| "createdDays"
>;

/** The raw (pre-shared-boost) score a single clause yields for a file. */
interface ClauseScore {
	score: number;
	indices: number[];
	primaryMatch: FileSearchResult["primaryMatch"];
	aliasMatched: boolean;
	isBrowse: boolean;
	isFilterOnly: boolean;
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
	// When set (a Boolean-OR query), a file matches if it satisfies ANY clause; the
	// flat fields above mirror clause 0 for callers that don't pass this. Null/absent
	// means the single-clause path built from the flat fields — byte-identical to the
	// pre-OR behavior.
	orClauses?: AdvancedQueryClause[] | null;
	recentPaths: string[];
	starredPaths: string[];
	bookmarkedPaths?: string[];
	openPaths?: Set<string>;
	includeCanvas: boolean;
	includePdf: boolean;
	includeBases?: boolean;
	excludeFolders?: string[];
	frecency?: Record<string, FrecencyEntry>;
	ranking?: Partial<RankingSettings>;
	rankingMode?: string;
	limit?: number;
}

export class FileSearcher {
	constructor(private app: App) {}

	search(options: FileSearchOptions): FileSearchResult[] {
		const files = getSearchableFiles(this.app, {
			includeCanvas: options.includeCanvas,
			includePdf: options.includePdf,
			includeBases: options.includeBases ?? false,
			excludeFolders: options.excludeFolders,
		});
		const limit = options.limit ?? 50;
		const ranking = normalizeRankingSettings(options.ranking);
		const boosts = rankingBoosts(resolveRankingMode(ranking, options.rankingMode));
		const recentSet = new Map(options.recentPaths.map((p, i) => [p, i]));
		const starredSet = new Map(options.starredPaths.map((p, i) => [p, i]));
		const bookmarkedSet = new Set(options.bookmarkedPaths ?? []);
		// OR support: iterate each alternative clause and keep the best-scoring one.
		// With no OR this is a single clause built from the flat options, so the
		// scoring arithmetic below is unchanged for every existing query.
		const clauses: FileSearchClause[] = options.orClauses && options.orClauses.length ? options.orClauses : [options];

		// Scan every file for a score, but only capture the cheap fields here. The
		// expensive per-file display metadata (tag/alias cache reads, relative-time
		// formatting, file-kind) is deferred until after the top-N slice below, so a
		// browse/empty query on a 10k-note vault does ~limit cache reads, not 10k.
		const scanned: ScanRow[] = [];

		for (const file of files) {
			const isStarred = starredSet.has(file.path);
			const isBookmarked = bookmarkedSet.has(file.path);

			// Best matching clause wins; a file is skipped only if no clause matches.
			let best: ClauseScore | null = null;
			for (const clause of clauses) {
				const result = this.scoreFileForClause(file, clause, ranking, boosts, isStarred, isBookmarked);
				if (result && (best === null || result.score > best.score)) best = result;
			}
			if (!best) continue;

			let score = best.score;
			const isBrowseMode = best.isBrowse;
			const isFilterOnly = best.isFilterOnly;

			const starredRank = starredSet.get(file.path);
			const recentRank = recentSet.get(file.path);
			if (ranking.preferStarredFiles && starredRank !== undefined) {
				score += 3000 - starredRank * 10;
			} else if (ranking.preferBookmarkedFiles && bookmarkedSet.has(file.path)) {
				score += 2000;
			} else if (ranking.preferRecentFiles && recentRank !== undefined) {
				score += 1000 - recentRank * 10;
			} else if (isBrowseMode) {
				// Clamp age at 0: a future-dated mtime (clock skew, imported files)
				// would otherwise make the subtracted term negative and inflate the
				// boost above browseMtimeHours, pinning skewed files to the top.
				const ageHours = Math.floor(Math.max(0, Date.now() - file.stat.mtime) / 3600000);
				score += Math.max(0, boosts.browseMtimeHours - ageHours);
			} else {
				const ageDays = Math.floor(Math.max(0, Date.now() - file.stat.mtime) / 86400000);
				score += Math.max(0, boosts.queryMtimeDays - ageDays);
			}

			if (ranking.preferOpenFiles && options.openPaths?.has(file.path)) score += 400;

			const fr = options.frecency?.[file.path];
			if (fr) {
				const freqBoost = Math.min(300, fr.count * 15);
				const ageDays = (Date.now() - fr.last) / 86400000;
				const recencyBoost = Math.max(0, 60 - Math.floor(ageDays) * 2);
				const weight = isBrowseMode || isFilterOnly ? 1 : boosts.frecencyWeight;
				score += Math.floor((freqBoost + recencyBoost) * weight);
			}

			scanned.push({ file, score, matchIndices: best.indices, primaryMatch: best.primaryMatch, aliasMatched: best.aliasMatched });
		}

		// Rank and cut to the visible window BEFORE paying for display metadata, so
		// tag/alias cache reads and time formatting run for ~limit files, not every
		// match (in browse mode that is the whole vault).
		scanned.sort((a, b) => b.score - a.score);
		return scanned.slice(0, limit).map((row) => {
			const file = row.file;
			const cache = file.extension === "md" ? this.app.metadataCache.getFileCache(file) : null;
			const tags = cache ? Array.from(collectFileTags(cache)).slice(0, 3) : [];
			const aliases = extractAliases(cache?.frontmatter ?? null).slice(0, 3);
			return {
				file,
				score: row.score,
				matchIndices: row.matchIndices,
				modifiedLabel: formatRelativeTime(file.stat.mtime),
				fileKind: getVaultFileKind(file),
				primaryMatch: row.primaryMatch,
				aliasMatched: row.aliasMatched,
				tags,
				aliases,
				isRecent: recentSet.has(file.path),
				isStarred: starredSet.has(file.path),
				isBookmarked: bookmarkedSet.has(file.path),
			};
		});
	}

	/**
	 * Score one file against one clause (one OR alternative). Returns null when the
	 * clause's filters exclude the file or its text tokens don't match. The score is
	 * the RAW score before the shared, clause-independent boosts (starred/recent/
	 * frecency/mtime) that search() applies once to the winning clause. For a no-OR
	 * query there is a single clause (the flat options), so this reproduces the
	 * original per-file scoring exactly.
	 */
	private scoreFileForClause(
		file: TFile,
		clause: FileSearchClause,
		ranking: RankingSettings,
		boosts: ReturnType<typeof rankingBoosts>,
		isStarred: boolean,
		isBookmarked: boolean
	): ClauseScore | null {
		if (!this.matchesExtFilter(file, clause.extFilters)) return null;
		if (!this.matchesAdvancedFileFilters(file, clause, ranking.ignoreDiacritics, isStarred, isBookmarked)) return null;
		if (!this.matchesFilters(file, clause)) return null;

		const hasActiveFilters =
			clause.tags.length > 0 || clause.properties.length > 0 || clause.extFilters.length > 0;
		const isBrowse = clause.textTokens.length === 0 && !hasActiveFilters;
		const isFilterOnly = clause.textTokens.length === 0 && hasActiveFilters;
		// Build the combined token list once per clause, not per file.
		const searchTokens = [...(clause.nameTerms ?? []), ...clause.textTokens];

		const basename = file.basename;
		let score = 0;
		let primaryMatch: FileSearchResult["primaryMatch"] = isBrowse ? "browse" : isFilterOnly ? "filters" : "filename";
		let aliasMatched = false;
		const indices: number[] = [];

		if (isBrowse) {
			score = 1;
		} else if (isFilterOnly) {
			score = 100;
			primaryMatch = "filters";
		} else {
			let matched = true;
			for (const token of searchTokens) {
				const basenameMatch = fuzzyMatch(token, basename, { ignoreDiacritics: ranking.ignoreDiacritics });
				if (basenameMatch) {
					score += basenameMatch.score + boosts.basename;
					primaryMatch = "filename";
					indices.push(...basenameMatch.indices);
					continue;
				}
				const pathMatch = fuzzyMatch(token, file.path, { ignoreDiacritics: ranking.ignoreDiacritics });
				const aliasHit = this.aliasMatches(file, token);
				if (!pathMatch && !aliasHit) {
					matched = false;
					break;
				}
				if (aliasHit) {
					aliasMatched = true;
					primaryMatch = "alias";
					score += boosts.alias;
				} else if (pathMatch) {
					if (primaryMatch !== "filename") primaryMatch = "path";
					score += Math.floor(pathMatch.score / 2) + boosts.path;
				}
			}
			if (!matched) score = 0;
		}

		if (score <= 0) return null;
		return { score, indices, primaryMatch, aliasMatched, isBrowse, isFilterOnly };
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

	private matchesFilters(file: TFile, clause: FileSearchClause): boolean {
		if (file.extension !== "md") {
			return clause.tags.length === 0 && clause.properties.length === 0;
		}

		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache) return clause.tags.length === 0 && clause.properties.length === 0;

		if (clause.tags.length > 0) {
			const tags = collectFileTags(cache);
			if (!fileMatchesTags(tags, clause.tags)) return false;
		}

		for (const prop of clause.properties) {
			const fm = cache.frontmatter as Record<string, unknown> | null | undefined;
			if (!fm) return false;
			const raw = getFrontmatterValue(fm, prop.key);
			if (!frontmatterValueMatches(raw, prop.value)) return false;
		}

		return true;
	}

	private matchesAdvancedFileFilters(file: TFile, clause: FileSearchClause, ignoreDiacritics: boolean, isStarred: boolean, isBookmarked: boolean): boolean {
		const lowerPath = file.path.toLowerCase();
		const lowerName = file.basename.toLowerCase();
		if (clause.isStarred && !isStarred) return false;
		if (clause.isBookmarked && !isBookmarked) return false;
		for (const folder of clause.folderIncludes ?? []) {
			const normalized = folder.toLowerCase().replace(/\/$/, "");
			if (!lowerPath.startsWith(`${normalized}/`) && !lowerPath.includes(`/${normalized}/`)) return false;
		}
		for (const term of clause.pathTerms ?? []) {
			if (!lowerPath.includes(term.toLowerCase())) return false;
		}
		for (const term of clause.nameTerms ?? []) {
			if (!lowerName.includes(term.toLowerCase()) && !fuzzyMatch(term, lowerName, { ignoreDiacritics })) return false;
		}
		for (const phrase of clause.phrases ?? []) {
			if (!lowerPath.includes(phrase.toLowerCase())) return false;
		}
		for (const exclusion of clause.exclusions ?? []) {
			if (lowerPath.includes(exclusion.toLowerCase())) return false;
		}
		if (clause.modifiedDays !== null && clause.modifiedDays !== undefined) {
			if (Date.now() - file.stat.mtime > clause.modifiedDays * 86400000) return false;
		}
		if (clause.createdDays !== null && clause.createdDays !== undefined) {
			if (Date.now() - file.stat.ctime > clause.createdDays * 86400000) return false;
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
