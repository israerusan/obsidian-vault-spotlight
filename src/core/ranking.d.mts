export type RankingMode = "balanced" | "filename" | "recency" | "metadata" | "alias";

export interface RankingSettings {
	mode: RankingMode;
	preferOpenFiles: boolean;
	preferStarredFiles: boolean;
	preferBookmarkedFiles: boolean;
	preferRecentFiles: boolean;
	ignoreDiacritics: boolean;
	showMatchReasons: boolean;
}

export const RANKING_MODES: Set<string>;
export const DEFAULT_RANKING_SETTINGS: RankingSettings;
export function normalizeRankingSettings(raw: unknown): RankingSettings;
export function resolveRankingMode(ranking: Partial<RankingSettings> | null | undefined, overrideMode?: string | null): RankingMode;
export function rankingBoosts(mode: RankingMode): {
	basename: number;
	path: number;
	alias: number;
	browseMtimeHours: number;
	queryMtimeDays: number;
	frecencyWeight: number;
};
