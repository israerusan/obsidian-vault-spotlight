export const PROFILE_MODES = new Set(["files", "content", "headings", "commands"]);

export function normalizeProfiles(rawProfiles) {
	if (!Array.isArray(rawProfiles)) return [];
	return rawProfiles
		.filter((profile) => profile && typeof profile === "object")
		.map((profile) => ({
			id: cleanId(profile.id) || `profile-${Date.now()}`,
			name: String(profile.name || "Untitled profile").trim() || "Untitled profile",
			defaultMode: PROFILE_MODES.has(profile.defaultMode) ? profile.defaultMode : "files",
			defaultQuery: String(profile.defaultQuery || ""),
			includeCanvas: profile.includeCanvas !== false,
			includePdf: profile.includePdf !== false,
			excludeFolders: Array.isArray(profile.excludeFolders)
				? profile.excludeFolders.map((f) => String(f).trim()).filter(Boolean)
				: [],
			showPreview: profile.showPreview === true,
		}))
		.slice(0, 20);
}

export function activeProfile(profiles, activeProfileId) {
	return profiles.find((profile) => profile.id === activeProfileId) ?? null;
}

export function createProfileFromSettings(name, settings, mode = "files", query = "") {
	return {
		id: cleanId(name) || `profile-${Date.now()}`,
		name: String(name || "New profile").trim() || "New profile",
		defaultMode: PROFILE_MODES.has(mode) ? mode : "files",
		defaultQuery: String(query || ""),
		includeCanvas: settings?.includeCanvas !== false,
		includePdf: settings?.includePdf !== false,
		excludeFolders: Array.isArray(settings?.excludeFolders) ? [...settings.excludeFolders] : [],
		showPreview: settings?.showPreview === true,
	};
}

function cleanId(value) {
	return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
