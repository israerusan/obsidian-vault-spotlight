/**
 * Single source of truth for Pro/free gating.
 *
 * Pure (no `obsidian` import) so the TypeScript UI and the Node tests read the
 * SAME truth. Before this module the gate was duplicated: the Pro-only mode set
 * lived in both modalCopy.mjs and an inline OR-chain in SpotlightModal; the free
 * workflow cap lived in workflowPresets.mjs; and three hand-written "what Pro
 * unlocks" strings (settings blurb, modal CTA, README table) had already drifted
 * apart. Everything now derives from here.
 */

/** How many workflows a free user can save (Pro is unlimited). */
export const FREE_WORKFLOW_LIMIT = 2;

/**
 * The search modes that require Pro — the ONE definition. modalCopy's mode filter
 * and the modal's runSearch gate both derive from it, so a mode can never be Pro
 * in one place and free in another.
 */
export const PRO_ONLY_MODES = new Set(["content", "headings", "links", "snippets"]);

export function isProOnlyMode(mode) {
	return PRO_ONLY_MODES.has(mode);
}

/**
 * Every capability whose tier is user-facing, keyed by a stable feature id.
 * `proOnly` is the gate; `freeLimit` (when present) is the free-tier count
 * allowance; `label` is the human name used to generate copy.
 *
 * Ranking controls & match-reason badges are intentionally FREE: they ship free
 * in the settings UI and the modal (the ranking section is ungated and the modal
 * passes ranking + match reasons unconditionally), so the table and copy say so
 * rather than claiming a Pro-only feature the code never gated.
 */
export const FEATURES = Object.freeze({
	// Free core
	fileLauncher: { proOnly: false, label: "File launcher, commands, symbols, editors, folders" },
	tagPropertyFilters: { proOnly: false, label: "Tag / property filters in file search" },
	quickActions: { proOnly: false, label: "Calculator, converters, date jump, quick capture" },
	actionPalette: { proOnly: false, label: "Action palette: open, copy, rename" },
	rankingControls: { proOnly: false, label: "Ranking controls & match-reason badges" },
	workflows: { proOnly: false, freeLimit: FREE_WORKFLOW_LIMIT, label: "Saved workflows" },
	// Pro
	contentSearch: { proOnly: true, mode: "content", label: "Body content search" },
	headingSearch: { proOnly: true, mode: "headings", label: "Heading search" },
	linksMode: { proOnly: true, mode: "links", label: "Links mode" },
	snippets: { proOnly: true, mode: "snippets", label: "Snippets" },
	previewPane: { proOnly: true, label: "Live preview pane" },
	batchActions: { proOnly: true, label: "Batch actions, export, starred pins" },
	searchProfiles: { proOnly: true, label: "Search profiles, aliases, advanced query language" },
	canvasPdfBases: { proOnly: true, label: "Canvas / PDF / Bases discovery & search" },
});

/** Accepts a FEATURES entry or its key; a free feature is always enabled. */
export function isFeatureEnabled(feature, isPro) {
	const gate = typeof feature === "string" ? FEATURES[feature] : feature;
	if (!gate) return true;
	return gate.proOnly ? isPro === true : true;
}

/** The free-tier count allowance for a feature, or Infinity when uncapped. */
export function featureFreeLimit(feature) {
	const gate = typeof feature === "string" ? FEATURES[feature] : feature;
	return gate && typeof gate.freeLimit === "number" ? gate.freeLimit : Infinity;
}

/** True if a free user may still add another of `feature` at the given count. */
export function withinFreeLimit(feature, count, isPro) {
	if (isPro === true) return true;
	return count < featureFreeLimit(feature);
}

/**
 * The one canonical "what Pro unlocks" phrase. The settings license blurb and the
 * modal CTA both build on this so the two can never drift again.
 */
export const PRO_UNLOCK_SUMMARY =
	"content, heading & link search, live preview, snippets, saved workflows, and batch actions";
