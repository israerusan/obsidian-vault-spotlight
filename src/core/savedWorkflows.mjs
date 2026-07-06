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

import { PROFILE_MODES } from "./searchProfiles.mjs";
import { RANKING_MODES } from "./ranking.mjs";
import { FREE_WORKFLOW_LIMIT } from "./featureGates.mjs";

// Sum of the legacy per-array caps (50 custom + 25 workflow + 20 profile) so a
// one-time migration of a maxed-out user never silently truncates entries.
export const MAX_SAVED_WORKFLOWS = 100;

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

function cleanId(value) {
	const id = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
	return id || "";
}

function normalizeScope(raw) {
	if (!raw || typeof raw !== "object") return undefined;
	return {
		includeCanvas: raw.includeCanvas !== false,
		includePdf: raw.includePdf !== false,
		includeBases: raw.includeBases !== false,
		excludeFolders: Array.isArray(raw.excludeFolders)
			? raw.excludeFolders.map((f) => String(f).trim()).filter(Boolean)
			: [],
		showPreview: raw.showPreview === true,
	};
}

/**
 * Sanitize a persisted (or migration-built) SavedWorkflow array: drop non-objects,
 * coerce/validate every field, re-mint colliding ids (settings pin/remove match by
 * id, so a shared id would act on both rows), and cap the list. Idempotent on the
 * output of buildSavedWorkflows so re-loading a migrated list is a no-op.
 */
export function normalizeSavedWorkflows(raw) {
	if (!Array.isArray(raw)) return [];
	const seen = new Set();
	const claim = (id, fallback, index) => {
		const base = cleanId(id) || `${fallback}-${index}`;
		let candidate = base;
		let n = 2;
		while (seen.has(candidate)) candidate = `${base}-${n++}`;
		seen.add(candidate);
		return candidate;
	};
	return raw
		.filter((w) => w && typeof w === "object")
		.map((w, index) => {
			const scope = normalizeScope(w.scope);
			return pruneUndefined({
				id: claim(w.id, "workflow", index),
				name: String(w.name || "Untitled workflow").trim() || "Untitled workflow",
				query: typeof w.query === "string" ? w.query : String(w.query || ""),
				mode: PROFILE_MODES.has(w.mode) ? w.mode : "files",
				pinned: w.pinned === true || undefined,
				starter: w.starter === true || undefined,
				rankingMode: RANKING_MODES.has(w.rankingMode) ? w.rankingMode : undefined,
				scope,
				sticky: w.sticky === true || undefined,
				exposeAsCommand: w.exposeAsCommand === true || undefined,
			});
		})
		.slice(0, MAX_SAVED_WORKFLOWS);
}

/** Build one SavedWorkflow for the Mod+S save path (mirrors createWorkflowPreset). */
export function createSavedWorkflow(name, mode, query, options = {}) {
	return pruneUndefined({
		id: cleanId(name) || `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		name: String(name || "New workflow").trim() || "New workflow",
		mode: PROFILE_MODES.has(mode) ? mode : "files",
		query: String(query || ""),
		pinned: options.pinned === true || undefined,
		starter: options.starter === true || undefined,
		rankingMode: RANKING_MODES.has(options.rankingMode) ? options.rankingMode : undefined,
		scope: normalizeScope(options.scope),
		sticky: options.sticky === true || undefined,
		exposeAsCommand: options.exposeAsCommand === true || undefined,
	});
}

/** Free tier may save until it hits the limit (counting only user-created rows,
 *  not seeded starters); Pro is unlimited. */
export function canSaveSavedWorkflow(savedWorkflows, isPro) {
	if (isPro) return true;
	const list = Array.isArray(savedWorkflows) ? savedWorkflows : [];
	return list.filter((w) => w && !w.starter).length < FREE_WORKFLOW_LIMIT;
}

/**
 * The unified saved-workflow list to READ during the deprecation window: the
 * migrated `savedWorkflows` unioned with any legacy `workflowPresets` not yet
 * folded in, de-duped by id (savedWorkflows win). Legacy presets map to the
 * SavedWorkflow shape (no scope — scope only exists once migrated). Lets the modal
 * and browse resolve workflows whether or not loadSettings ran the migration (the
 * test harness seeds legacy-only fixtures).
 */
export function resolveSavedWorkflows(savedWorkflows, workflowPresets) {
	const out = normalizeSavedWorkflows(savedWorkflows);
	const seen = new Set(out.map((w) => w.id));
	for (const p of Array.isArray(workflowPresets) ? workflowPresets : []) {
		if (!p || typeof p !== "object" || seen.has(p.id)) continue;
		seen.add(p.id);
		out.push(
			pruneUndefined({
				id: p.id,
				name: p.name || "Untitled workflow",
				query: typeof p.query === "string" ? p.query : "",
				mode: p.mode || "files",
				pinned: p.pinned === true || undefined,
				starter: p.starter === true || undefined,
				rankingMode: p.rankingMode || undefined,
			})
		);
	}
	return out;
}
