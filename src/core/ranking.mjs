export const RANKING_MODES = new Set(["balanced", "filename", "recency", "metadata", "alias"]);

export const DEFAULT_RANKING_SETTINGS = {
	mode: "balanced",
	preferOpenFiles: true,
	preferStarredFiles: true,
	preferBookmarkedFiles: true,
	preferRecentFiles: true,
	ignoreDiacritics: false,
	showMatchReasons: true,
};

export function normalizeRankingSettings(raw) {
	const source = raw && typeof raw === "object" ? raw : {};
	return {
		mode: RANKING_MODES.has(source.mode) ? source.mode : DEFAULT_RANKING_SETTINGS.mode,
		preferOpenFiles: source.preferOpenFiles !== false,
		preferStarredFiles: source.preferStarredFiles !== false,
		preferBookmarkedFiles: source.preferBookmarkedFiles !== false,
		preferRecentFiles: source.preferRecentFiles !== false,
		ignoreDiacritics: source.ignoreDiacritics === true,
		showMatchReasons: source.showMatchReasons !== false,
	};
}

export function resolveRankingMode(ranking, overrideMode) {
	if (RANKING_MODES.has(overrideMode)) return overrideMode;
	return normalizeRankingSettings(ranking).mode;
}

export function rankingBoosts(mode) {
	switch (mode) {
		case "filename":
			return { basename: 26, path: 8, alias: 14, browseMtimeHours: 36, queryMtimeDays: 6, frecencyWeight: 0.2 };
		case "recency":
			return { basename: 18, path: 10, alias: 14, browseMtimeHours: 180, queryMtimeDays: 18, frecencyWeight: 0.85 };
		case "metadata":
			return { basename: 16, path: 10, alias: 16, browseMtimeHours: 72, queryMtimeDays: 10, frecencyWeight: 0.45 };
		case "alias":
			return { basename: 15, path: 9, alias: 26, browseMtimeHours: 60, queryMtimeDays: 8, frecencyWeight: 0.35 };
		default:
			return { basename: 20, path: 9, alias: 18, browseMtimeHours: 100, queryMtimeDays: 10, frecencyWeight: 0.25 };
	}
}
