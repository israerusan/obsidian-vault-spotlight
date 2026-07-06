import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { canSaveWorkflowPreset, FREE_WORKFLOW_LIMIT as PRESET_LIMIT } from "../src/core/workflowPresets.mjs";
import {
	FEATURES,
	FREE_WORKFLOW_LIMIT,
	isFeatureEnabled,
	isProOnlyMode,
	withinFreeLimit,
} from "../src/core/featureGates.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
// The spotlight UI is split across modules (modal, batch ops, rendering,
// preview, types) — feature assertions scan the whole directory.
const spotlightDir = path.join(repoRoot, "src", "spotlight");
const spotlight = fs
	.readdirSync(spotlightDir)
	.filter((name) => name.endsWith(".ts"))
	.map((name) => fs.readFileSync(path.join(spotlightDir, name), "utf8"))
	.join("\n");
const settings = fs.readFileSync(path.join(repoRoot, "src", "settings.ts"), "utf8");
const readme = fs.readFileSync(path.join(repoRoot, "README.md"), "utf8");

assert.ok(spotlight.includes('kind: "action"'), "spotlight should expose a keyboard action-palette result kind");
assert.ok(spotlight.includes("openActionPalette"), "spotlight should open an action palette from the selected result");
assert.ok(spotlight.includes("Ctrl") && spotlight.includes("K"), "spotlight footer/shortcuts should advertise Ctrl+K actions");
assert.ok(spotlight.includes("requiresPro") && spotlight.includes("settings.isPro"), "actions should carry and enforce Pro gating");

assert.ok(settings.includes("pinnedCustomSearchIds"), "settings should persist pinned smart collections");
assert.ok(settings.includes("searchProfiles"), "settings should persist Pro search profiles");
assert.ok(spotlight.includes('kind: "profile"'), "empty browse should show search profiles as selectable results");
assert.ok(spotlight.includes("activateProfile"), "spotlight should activate a selected search profile");
assert.ok(spotlight.includes('kind: "collection"'), "empty browse should show smart collections as selectable results");
assert.ok(spotlight.includes("togglePinnedCollection"), "spotlight should let users pin/unpin smart collections");

assert.ok(spotlight.includes("exportResultsToNote"), "spotlight should export search results to a Markdown note");
assert.ok(spotlight.includes("copyResultsAsMarkdown"), "spotlight should copy selected/search results as Markdown links");
assert.ok(spotlight.includes("batchAddTag"), "spotlight should support a Pro batch add-tag action");
assert.ok(spotlight.includes("batchRemoveTag"), "spotlight should support a Pro batch remove-tag action");
assert.ok(spotlight.includes("batchSetProperty"), "spotlight should support a Pro batch set-property action");
assert.ok(spotlight.includes("batchMoveFiles"), "spotlight should support a Pro batch move action");
assert.ok(spotlight.includes("createMocFromResults"), "spotlight should support MOC generation from results");
assert.ok(spotlight.includes("appendLinksToActiveNote"), "spotlight should append result links to the active note");
assert.ok(settings.includes("searchAliases"), "settings should persist Pro query aliases");
assert.ok(spotlight.includes('"links"'), "spotlight should include Pro links mode");
assert.ok(spotlight.includes("linkModeItems"), "spotlight should resolve backlinks/outlinks in links mode");
assert.ok(spotlight.includes("Search in Omnisearch"), "spotlight should expose Omnisearch handoff when installed");
// Regression (critique #1): the free "save a workflow" path must be reachable.
// A prior version registered Mod+S only AFTER `if (!isPro) return`, so pressing
// Mod+S did nothing for free users despite Settings advertising it. The keyboard
// layer now lives in spotlight/keymap.ts; assert Mod+S is registered before the
// Pro gate there. (The modal harness also verifies this behaviorally.)
const keymapSrc = fs.readFileSync(path.join(spotlightDir, "keymap.ts"), "utf8");
const modSaveIdx = keymapSrc.indexOf('scope.register(["Mod"], "s"');
// Mod+Space (toggle multi-select check) is the FIRST shortcut registered after the
// `if (!isPro) return` gate, so Mod+S appearing before it proves Mod+S is ungated.
const proShortcutIdx = keymapSrc.indexOf('scope.register(["Mod"], " "');
assert.ok(modSaveIdx !== -1 && proShortcutIdx !== -1, "keymap should register Mod+S and the Pro-only Mod+Space shortcut");
assert.ok(modSaveIdx < proShortcutIdx, "Mod+S (save workflow) must be registered before the Pro-only shortcuts so free users can save workflows");
assert.equal(canSaveWorkflowPreset([], false), true, "free tier can save its first workflow");
assert.equal(canSaveWorkflowPreset([{}, {}], false), false, "free tier is capped at the free workflow limit");
assert.equal(canSaveWorkflowPreset([], true), true, "Pro can always save a workflow");
// Regression (critique #2): the orphaned custom-search create path is retired,
// not silently dead — Mod+S saves a workflow for everyone instead.
assert.ok(!spotlight.includes("saveCustomSearch"), "the dead saveCustomSearch path should be removed, not left unreachable");

assert.ok(readme.includes("Action palette"), "README should document the action palette");
assert.ok(/\bWorkflows\b/.test(readme), "README should feature Workflows as a core pillar");
assert.ok(/export/i.test(readme), "README should document result export");

// --- featureGates: the single source of truth ---

// Pro-only features are gated; free features are always enabled.
for (const key of ["contentSearch", "headingSearch", "linksMode", "snippets", "previewPane", "batchActions", "searchProfiles"]) {
	assert.equal(isFeatureEnabled(FEATURES[key], false), false, `${key} is locked on the free tier`);
	assert.equal(isFeatureEnabled(FEATURES[key], true), true, `${key} unlocks with Pro`);
}
for (const key of ["fileLauncher", "tagPropertyFilters", "quickActions", "actionPalette", "workflows"]) {
	assert.equal(isFeatureEnabled(FEATURES[key], false), true, `${key} is free`);
}

// Ranking controls & match-reason badges are FREE — matches the shipping settings
// UI (ungated) and the modal (passes ranking + match reasons unconditionally). If
// this flips, the README table and the code gate must move together.
assert.equal(FEATURES.rankingControls.proOnly, false, "ranking controls are free (docs must match code)");
assert.equal(isFeatureEnabled(FEATURES.rankingControls, false), true, "free users get ranking controls");

// The Pro-only mode set has ONE definition — accept it by string too.
assert.ok(isProOnlyMode("content") && isProOnlyMode("headings") && isProOnlyMode("links") && isProOnlyMode("snippets"), "the four Pro modes gate");
for (const free of ["files", "symbols", "commands", "editors", "folders"]) {
	assert.equal(isProOnlyMode(free), false, `${free} is a free mode`);
}

// Single source of truth for the free workflow cap: workflowPresets re-exports it.
assert.equal(FREE_WORKFLOW_LIMIT, 2, "free workflow limit is 2");
assert.equal(PRESET_LIMIT, FREE_WORKFLOW_LIMIT, "workflowPresets.FREE_WORKFLOW_LIMIT derives from featureGates (single source)");
assert.equal(FEATURES.workflows.freeLimit, FREE_WORKFLOW_LIMIT, "the workflows feature carries the same cap");

// withinFreeLimit mirrors the workflow cap and Pro override.
assert.equal(withinFreeLimit(FEATURES.workflows, 0, false), true, "free tier can add its first workflow");
assert.equal(withinFreeLimit(FEATURES.workflows, 2, false), false, "free tier is capped at the limit");
assert.equal(withinFreeLimit(FEATURES.workflows, 2, true), true, "Pro is never capped");

console.log("feature gate tests passed");
