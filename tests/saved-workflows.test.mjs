import assert from "assert";
import {
	buildSavedWorkflows,
	canSaveSavedWorkflow,
	createSavedWorkflow,
	MAX_SAVED_WORKFLOWS,
	migratedActiveWorkflowId,
	normalizeSavedWorkflows,
	resolveSavedWorkflows,
} from "../src/core/savedWorkflows.mjs";

// A realistic 5-array legacy data.json snapshot.
const legacy = {
	workflowPresets: [
		{ id: "recent", name: "Recent work", query: "modified:7", mode: "files", pinned: true, starter: true },
		{ id: "research-run", name: "Research", query: "> ai", mode: "content", profileId: "research", rankingMode: "recency" },
	],
	searchProfiles: [
		{ id: "research", name: "Research", defaultMode: "content", defaultQuery: "> ai", includeCanvas: true, includePdf: false, excludeFolders: ["Archive"], showPreview: true },
		{ id: "writing", name: "Writing", defaultMode: "files", defaultQuery: "Draft", includeBases: false },
	],
	customSearches: [
		{ id: "clients", name: "Clients", query: "in:Clients" },
		{ id: "waiting", name: "Waiting", query: "#waiting" },
	],
	pinnedCustomSearchIds: ["clients"],
	activeProfileId: "writing",
};

const merged = buildSavedWorkflows(legacy);
const byId = new Map(merged.map((w) => [w.id, w]));

// (a) presets survive; a preset referencing a profile inlines that profile's scope.
assert.ok(byId.has("recent"), "workflow preset kept");
assert.equal(byId.get("recent").pinned, true, "preset pin state preserved");
assert.equal(byId.get("recent").starter, true, "preset starter flag preserved");
const researchRun = byId.get("research-run");
assert.ok(researchRun.scope, "preset with a profile inlines the profile scope");
assert.deepEqual(researchRun.scope.excludeFolders, ["Archive"], "inlined scope carries excludeFolders");
assert.equal(researchRun.scope.includePdf, false, "inlined scope carries includePdf=false");
assert.equal(researchRun.rankingMode, "recency", "preset ranking mode preserved");

// (b) custom searches become command-exposed workflows, REUSING their exact id
// (so custom-search-<id> command ids / hotkeys survive), and carry pin state.
const clients = byId.get("clients");
assert.ok(clients, "custom search kept with its exact id");
assert.equal(clients.exposeAsCommand, true, "custom search stays command-exposed");
assert.equal(clients.pinned, true, "pinned custom search carries its pin");
assert.notEqual(byId.get("waiting").pinned, true, "unpinned custom search is not pinned");

// (c) a profile referenced by NO workflow becomes a standalone sticky scope workflow;
// a profile referenced by a preset is NOT duplicated as a standalone entry.
const writing = byId.get("writing");
assert.ok(writing, "orphan profile preserved as a standalone workflow");
assert.equal(writing.sticky, true, "standalone profile workflow is sticky");
assert.equal(writing.scope.includeBases, false, "orphan profile scope preserved");
assert.equal(merged.filter((w) => w.name === "Research" && w.sticky).length, 0, "a referenced profile is not also emitted standalone");

// activeProfileId remaps to the same-id standalone workflow.
assert.equal(migratedActiveWorkflowId(legacy), "writing", "active profile maps to its workflow id");

// Colliding ids across the arrays are re-minted unique (no shared ids).
const dupe = buildSavedWorkflows({
	workflowPresets: [{ id: "x", name: "A", mode: "files" }],
	customSearches: [{ id: "x", name: "B", query: "q" }],
});
assert.equal(new Set(dupe.map((w) => w.id)).size, 2, "colliding ids across concepts are made unique");

// Empty / missing legacy is safe.
assert.deepEqual(buildSavedWorkflows({}), [], "empty legacy yields no workflows");
assert.deepEqual(buildSavedWorkflows(null), [], "null legacy is safe");

// --- normalizeSavedWorkflows: sanitize a persisted list ---

// Idempotent on buildSavedWorkflows output (re-loading a migrated list is a no-op).
assert.deepEqual(normalizeSavedWorkflows(merged), merged, "normalize is idempotent on migrated output");

// Drops non-objects, coerces fields, defaults an invalid mode to files.
const cleaned = normalizeSavedWorkflows([
	null,
	"nope",
	{ id: "a", name: "A", query: "q", mode: "content" },
	{ name: "No id", mode: "bogus-mode" },
]);
assert.equal(cleaned.length, 2, "malformed rows are dropped");
assert.equal(cleaned[1].mode, "files", "an invalid mode falls back to files");

// Re-mints colliding ids so pin/remove can't act on two rows at once.
const collided = normalizeSavedWorkflows([
	{ id: "dup", name: "One", mode: "files" },
	{ id: "dup", name: "Two", mode: "files" },
]);
assert.equal(new Set(collided.map((w) => w.id)).size, 2, "colliding ids are re-minted unique");

// Caps the list so a hostile/huge persisted array can't grow unbounded.
const many = normalizeSavedWorkflows(Array.from({ length: MAX_SAVED_WORKFLOWS + 20 }, (_, i) => ({ id: `w${i}`, name: `W${i}`, mode: "files" })));
assert.equal(many.length, MAX_SAVED_WORKFLOWS, "the list is capped at MAX_SAVED_WORKFLOWS");

// --- createSavedWorkflow ---
const created = createSavedWorkflow("My Search", "content", "widget OR gadget", { rankingMode: "recency" });
assert.equal(created.id, "my-search", "id slugs from the name");
assert.equal(created.mode, "content", "mode passes through when valid");
assert.equal(created.query, "widget OR gadget", "query is preserved verbatim");
assert.equal(created.rankingMode, "recency", "valid ranking mode is kept");
assert.equal(createSavedWorkflow("x", "not-a-mode", "").mode, "files", "invalid mode defaults to files");

// --- canSaveSavedWorkflow (free cap counts only user-created rows) ---
assert.equal(canSaveSavedWorkflow([], false), true, "free tier can save its first");
assert.equal(canSaveSavedWorkflow([{ id: "a" }, { id: "b" }], false), false, "free tier is capped at the limit");
assert.equal(canSaveSavedWorkflow([{ id: "a" }, { id: "b" }], true), true, "Pro is never capped");
assert.equal(
	canSaveSavedWorkflow([{ id: "a", starter: true }, { id: "b", starter: true }], false),
	true,
	"seeded starters don't count against the free cap"
);

// --- resolveSavedWorkflows: union of savedWorkflows + legacy presets, deduped ---
const unioned = resolveSavedWorkflows(
	[{ id: "s1", name: "Saved", mode: "files" }],
	[{ id: "s1", name: "Legacy dup", mode: "files" }, { id: "p1", name: "Legacy only", mode: "content" }]
);
assert.equal(unioned.length, 2, "union de-dupes by id (savedWorkflows win)");
assert.equal(unioned.find((w) => w.id === "s1").name, "Saved", "the savedWorkflows entry wins a collision");
assert.ok(unioned.some((w) => w.id === "p1"), "a legacy-only preset is included in the union");

console.log("saved-workflows tests passed");
