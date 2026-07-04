import { PROFILE_MODES } from "./searchProfiles.mjs";
import { RANKING_MODES } from "./ranking.mjs";

export const FREE_WORKFLOW_LIMIT = 2;
export const MAX_WORKFLOW_PRESETS = 25;

// Starter queries MUST use syntax the engines actually run — the query language
// has no Boolean OR (parseAdvancedQuery treats a bare "OR" as a required text
// token and AND-s tag filters), so an "#a OR #b" starter would demonstrate Pro
// value by returning nothing. Keep each starter to one working filter.
export const STARTER_WORKFLOWS = [
	{ id: "starter-recent-work", name: "Recent work", mode: "files", query: "modified:7", pinned: true, starter: true },
	{ id: "starter-follow-ups", name: "Follow-ups", mode: "files", query: "#followup", pinned: true, starter: true },
	{ id: "starter-meetings", name: "Meeting notes", mode: "content", query: "action item", pinned: false, starter: true },
	{ id: "starter-clients", name: "Client folder", mode: "files", query: "in:Clients", pinned: false, starter: true },
];

export function normalizeWorkflowPresets(raw) {
	if (!Array.isArray(raw)) return [];
	// Re-mint colliding ids: two presets whose stored ids slugify equal (e.g. two
	// workflows both named "Meeting") would share an id, and the settings tab's
	// pin/remove match by id — so Remove-one would delete both. Mirrors the de-dup
	// pass in normalizeSnippets.
	const seen = new Set();
	return raw
		.filter((workflow) => workflow && typeof workflow === "object")
		.map((workflow, index) => ({
			id: uniqueId(cleanId(workflow.id) || `workflow-${Date.now()}-${index}`, seen),
			name: String(workflow.name || "Untitled workflow").trim() || "Untitled workflow",
			query: typeof workflow.query === "string" ? workflow.query : String(workflow.query || ""),
			mode: PROFILE_MODES.has(workflow.mode) ? workflow.mode : "files",
			profileId: cleanId(workflow.profileId),
			pinned: workflow.pinned === true,
			starter: workflow.starter === true,
			rankingMode: RANKING_MODES.has(workflow.rankingMode) ? workflow.rankingMode : undefined,
		}))
		.slice(0, MAX_WORKFLOW_PRESETS);
}

export function ensureStarterWorkflows(workflows) {
	const normalized = normalizeWorkflowPresets(workflows);
	return normalized.length > 0 ? normalized : STARTER_WORKFLOWS.map((workflow) => ({ ...workflow }));
}

export function canSaveWorkflowPreset(workflows, isPro) {
	if (isPro) return true;
	return normalizeWorkflowPresets(workflows).length < FREE_WORKFLOW_LIMIT;
}

export function createWorkflowPreset(name, mode, query, options = {}) {
	return {
		// A random suffix on the fallback id avoids collisions when two presets
		// with unsluggable names (all symbols) are created in the same millisecond.
		id: cleanId(name) || `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		name: String(name || "New workflow").trim() || "New workflow",
		mode: PROFILE_MODES.has(mode) ? mode : "files",
		query: String(query || ""),
		profileId: cleanId(options.profileId),
		pinned: options.pinned === true,
		starter: options.starter === true,
		rankingMode: RANKING_MODES.has(options.rankingMode) ? options.rankingMode : undefined,
	};
}

function cleanId(value) {
	const id = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
	return id || "";
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
