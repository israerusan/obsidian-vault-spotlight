import { RANKING_MODES } from "./ranking.mjs";

/** Hard cap on stored search profiles (shared by the normalizer and the UI). */
export const MAX_SEARCH_PROFILES = 20;

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
	// Re-mint colliding ids: two entries whose stored ids slugify to the same
	// value would otherwise share an id, and the settings tab's pin/remove/activate
	// match by id — so acting on one row would silently hit both. Mirrors the
	// de-dup pass in normalizeSnippets.
	const seen = new Set();
	return rawProfiles
		.filter((profile) => profile && typeof profile === "object")
		.map((profile, index) => ({
			id: uniqueId(cleanId(profile.id) || `profile-${Date.now()}-${index}`, seen),
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
		.slice(0, MAX_SEARCH_PROFILES);
}

export function activeProfile(profiles, activeProfileId) {
	return profiles.find((profile) => profile.id === activeProfileId) ?? null;
}

export function createProfileFromSettings(name, settings, mode = "files", query = "", existingIds = []) {
	// Dedup against ids already in use so re-adding after a removal can't mint a
	// colliding id. The settings "Add profile" button names entries "Profile N"
	// by list length, so after removing a middle profile the counter reuses a
	// number → cleanId() would produce a duplicate, and the settings tab matches
	// pin/remove/activate BY id (acting on one row would hit both). Mirrors the
	// re-mint pass normalizeProfiles runs on load, but at creation time.
	const seen = new Set(Array.isArray(existingIds) ? existingIds : []);
	// Random suffix on the fallback id so two unsluggable names created in the
	// same millisecond don't collide even before the uniqueId pass.
	const base = cleanId(name) || `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	return {
		id: uniqueId(base, seen),
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

/** Return `base` if free, else the first `base-2`, `base-3`, … not yet in `seen`.
 * Records the chosen id so a later caller with the same base gets the next suffix. */
function uniqueId(base, seen) {
	let id = base;
	let n = 2;
	while (seen.has(id)) id = `${base}-${n++}`;
	seen.add(id);
	return id;
}
