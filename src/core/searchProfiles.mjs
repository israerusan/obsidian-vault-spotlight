import { RANKING_MODES } from "./ranking.mjs";

export const PROFILE_MODES = new Set([
	"files",
	"content",
	"headings",
	"symbols",
	"commands",
	"links",
	"editors",
	"folders",
]);

export function normalizeProfiles(rawProfiles) {
	if (!Array.isArray(rawProfiles)) return [];
	return rawProfiles
		.filter((profile) => profile && typeof profile === "object")
		.map((profile, index) => ({
			id: cleanId(profile.id) || `profile-${Date.now()}-${index}`,
			name: String(profile.name || "Untitled profile").trim() || "Untitled profile",
			defaultMode: PROFILE_MODES.has(profile.defaultMode) ? profile.defaultMode : "files",
			defaultQuery: String(profile.defaultQuery || ""),
			includeCanvas: profile.includeCanvas !== false,
			includePdf: profile.includePdf !== false,
			includeBases: profile.includeBases !== false,
			excludeFolders: Array.isArray(profile.excludeFolders)
				? profile.excludeFolders.map((f) => String(f).trim()).filter(Boolean)
				: [],
			showPreview: profile.showPreview === true,
			rankingMode: RANKING_MODES.has(profile.rankingMode) ? profile.rankingMode : undefined,
		}))
		.slice(0, 20);
}

export function activeProfile(profiles, activeProfileId) {
	return profiles.find((profile) => profile.id === activeProfileId) ?? null;
}

export function createProfileFromSettings(name, settings, mode = "files", query = "") {
	return {
		// Random suffix on the fallback id so two unsluggable names created in
		// the same millisecond don't collide (pin/remove/activate would hit both).
		id: cleanId(name) || `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		name: String(name || "New profile").trim() || "New profile",
		defaultMode: PROFILE_MODES.has(mode) ? mode : "files",
		defaultQuery: String(query || ""),
		includeCanvas: settings?.includeCanvas !== false,
		includePdf: settings?.includePdf !== false,
		includeBases: settings?.includeBases !== false,
		excludeFolders: Array.isArray(settings?.excludeFolders) ? [...settings.excludeFolders] : [],
		showPreview: settings?.showPreview === true,
		rankingMode: RANKING_MODES.has(settings?.ranking?.mode) ? settings.ranking.mode : undefined,
	};
}

function cleanId(value) {
	return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
