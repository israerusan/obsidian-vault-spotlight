/**
 * GROUNDWORK for consolidating the overlapping saved-search concepts into ONE
 * "Saved workflow" list. Pure and, deliberately, NOT YET WIRED into loadSettings:
 * activating the migration (persisting `savedWorkflows`, reading through legacy for
 * a deprecation window, then removing the legacy arrays) touches paid users'
 * data.json and hotkey-bound `custom-search-<id>` command ids, so it ships as its
 * own reviewed release. Keeping the merge here, unit-tested, makes that follow-up
 * test-first.
 *
 * Folds:  workflowPresets, searchProfiles, customSearches, pinnedCustomSearchIds.
 * Stays separate:  searchAliases (an inline expansion macro, not a runnable search).
 *
 * SavedWorkflow shape (advanced props are optional so a casual row is just
 * name+query+mode):
 *   { id, name, query, mode,
 *     pinned?, starter?, rankingMode?,
 *     scope?: { includeCanvas, includePdf, includeBases, excludeFolders, showPreview },
 *     sticky?,            // scope persists after apply (old active-profile) vs one-shot
 *     exposeAsCommand? }  // keep registering custom-search-<id> so hotkeys survive
 */

function scopeOf(profile) {
	return {
		includeCanvas: profile.includeCanvas !== false,
		includePdf: profile.includePdf !== false,
		includeBases: profile.includeBases !== false,
		excludeFolders: Array.isArray(profile.excludeFolders) ? profile.excludeFolders.slice() : [],
		showPreview: profile.showPreview === true,
	};
}

function pruneUndefined(obj) {
	const out = {};
	for (const key of Object.keys(obj)) if (obj[key] !== undefined) out[key] = obj[key];
	return out;
}

/**
 * Merge the legacy saved-search arrays into one ordered SavedWorkflow list.
 * Non-destructive: the caller keeps the legacy arrays; this only derives the new one.
 * @param {{workflowPresets?: any[], searchProfiles?: any[], customSearches?: any[], pinnedCustomSearchIds?: string[]}} legacy
 * @returns {Array<object>}
 */
export function buildSavedWorkflows(legacy) {
	const workflowPresets = Array.isArray(legacy && legacy.workflowPresets) ? legacy.workflowPresets : [];
	const searchProfiles = Array.isArray(legacy && legacy.searchProfiles) ? legacy.searchProfiles : [];
	const customSearches = Array.isArray(legacy && legacy.customSearches) ? legacy.customSearches : [];
	const pinned = new Set(Array.isArray(legacy && legacy.pinnedCustomSearchIds) ? legacy.pinnedCustomSearchIds : []);
	const profileById = new Map(searchProfiles.filter((p) => p && p.id).map((p) => [p.id, p]));
	const referenced = new Set(workflowPresets.map((w) => w && w.profileId).filter(Boolean));

	const seen = new Set();
	const claim = (id, fallback) => {
		const base = id || fallback;
		let candidate = base;
		let n = 2;
		while (seen.has(candidate)) candidate = `${base}-${n++}`;
		seen.add(candidate);
		return candidate;
	};
	const out = [];

	// (a) Workflow presets → workflows, inlining the referenced profile's scope so
	// applying the workflow reproduces the old profile+preset combo in one step.
	for (const w of workflowPresets) {
		if (!w || typeof w !== "object") continue;
		const profile = w.profileId ? profileById.get(w.profileId) : null;
		out.push(
			pruneUndefined({
				id: claim(w.id, "workflow"),
				name: w.name || "Untitled workflow",
				query: typeof w.query === "string" ? w.query : "",
				mode: w.mode || "files",
				pinned: w.pinned === true || undefined,
				starter: w.starter === true || undefined,
				rankingMode: w.rankingMode || undefined,
				scope: profile ? scopeOf(profile) : undefined,
			})
		);
	}

	// (b) Custom searches → workflows with exposeAsCommand, REUSING the exact id so
	// custom-search-<id> command ids and any user hotkeys stay valid.
	for (const c of customSearches) {
		if (!c || typeof c !== "object") continue;
		out.push(
			pruneUndefined({
				id: claim(c.id, "search"),
				name: c.name || "Saved search",
				query: typeof c.query === "string" ? c.query : "",
				mode: "files",
				pinned: pinned.has(c.id) || undefined,
				exposeAsCommand: true,
			})
		);
	}

	// (c) Profiles referenced by NO workflow → standalone scope-only workflows so
	// nothing is lost. Sticky, because an active profile applied its scope persistently.
	for (const p of searchProfiles) {
		if (!p || typeof p !== "object" || referenced.has(p.id)) continue;
		out.push(
			pruneUndefined({
				id: claim(p.id, "profile"),
				name: p.name || "Profile",
				query: typeof p.defaultQuery === "string" ? p.defaultQuery : "",
				mode: p.defaultMode || "files",
				rankingMode: p.rankingMode || undefined,
				scope: scopeOf(p),
				sticky: true,
			})
		);
	}

	return out;
}

/** The old activeProfileId maps to the same-id standalone profile workflow. */
export function migratedActiveWorkflowId(legacy) {
	return legacy && typeof legacy.activeProfileId === "string" ? legacy.activeProfileId : "";
}
