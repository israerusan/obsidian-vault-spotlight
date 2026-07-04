import assert from "assert";
import { fuzzyMatch } from "../src/core/fuzzy.mjs";
import {
  STARTER_WORKFLOWS,
  canSaveWorkflowPreset,
  createWorkflowPreset,
  ensureStarterWorkflows,
  normalizeWorkflowPresets,
} from "../src/core/workflowPresets.mjs";
import {
  normalizeRankingSettings,
  resolveRankingMode,
} from "../src/core/ranking.mjs";
import { buildFileDecorations } from "../src/core/resultDecorators.mjs";

const presets = normalizeWorkflowPresets([
  { id: "weekly", name: "Weekly review", query: 'tag:weekly modified:7d', mode: "files", pinned: true, rankingMode: "recency" },
  { id: "bad", name: "", query: 42, mode: "nope" },
]);
assert.equal(presets.length, 2, "workflow normalization should keep valid-ish objects and coerce defaults");
assert.equal(presets[0].rankingMode, "recency", "workflow ranking overrides should survive normalization");
assert.equal(presets[1].mode, "files", "invalid workflow modes should fall back to files");
assert.equal(presets[1].name, "Untitled workflow", "blank workflow names should be repaired");

// Two presets whose ids slugify to the same value must not keep a shared id —
// settings pin/remove match by id, so Remove-one would otherwise delete both.
const dupWorkflows = normalizeWorkflowPresets([
  { id: "meeting", name: "Meeting", mode: "files" },
  { id: "Meeting!", name: "Meeting", mode: "files" },
  { id: "meeting", name: "Meeting", mode: "files" },
]);
assert.equal(new Set(dupWorkflows.map((w) => w.id)).size, 3, "colliding workflow ids are re-minted unique");

const starterOnly = ensureStarterWorkflows([]);
assert.equal(starterOnly.length, STARTER_WORKFLOWS.length, "starter workflows should appear when the user has none");
assert.equal(ensureStarterWorkflows(presets).length, presets.length, "real workflows should suppress starter examples");

assert.equal(canSaveWorkflowPreset([], false), true, "free users can save the first workflow");
assert.equal(canSaveWorkflowPreset([{ id: "1" }, { id: "2" }], false), false, "free users are capped at two workflows");
assert.equal(canSaveWorkflowPreset([{ id: "1" }, { id: "2" }], true), true, "Pro users can exceed the free workflow cap");

const created = createWorkflowPreset("Client triage", "content", "> acme", {
  pinned: true,
  profileId: "research",
  rankingMode: "metadata",
});
assert.equal(created.name, "Client triage");
assert.equal(created.mode, "content");
assert.equal(created.pinned, true);
assert.equal(created.profileId, "research");
assert.equal(created.rankingMode, "metadata");

const ranking = normalizeRankingSettings({ mode: "filename", preferOpenFiles: false, ignoreDiacritics: true });
assert.equal(ranking.mode, "filename", "ranking mode should normalize");
assert.equal(ranking.preferOpenFiles, false, "explicit ranking toggles should survive normalization");
assert.equal(ranking.preferStarredFiles, true, "missing ranking toggles should default on");
assert.equal(resolveRankingMode(ranking, "alias"), "alias", "workflow/profile override should win over global ranking mode");
assert.equal(resolveRankingMode(ranking, undefined), "filename", "global ranking mode should be used when no override exists");

const plainAccent = fuzzyMatch("resume", "Résumé");
const ignoredAccent = fuzzyMatch("resume", "Résumé", { ignoreDiacritics: true });
assert.ok(plainAccent && plainAccent.indices.length === 0, "without ignoreDiacritics, accent-only matches should fall back to low-confidence typo scoring");
assert.ok(ignoredAccent && ignoredAccent.indices.length > 0, "ignoreDiacritics should enable direct highlighted fuzzy matches");
assert.ok(ignoredAccent && plainAccent && ignoredAccent.score > plainAccent.score, "accent-insensitive direct matches should outrank typo fallback matches");

const decor = buildFileDecorations({
  parentPath: "Clients/Acme",
  modifiedLabel: "2d ago",
  fileKind: "pdf",
  isStarred: true,
  isBookmarked: false,
  isRecent: false,
  primaryMatch: "alias",
  aliasMatched: true,
  tags: ["client", "urgent"],
  aliases: ["Acme Deck"],
});
assert.ok(decor.badges.includes("Starred"), "decorations should expose starred state");
assert.ok(decor.badges.includes("PDF"), "decorations should expose non-markdown type badges");
assert.equal(decor.reason, "Matched alias", "decorations should produce a human-readable match reason");
assert.ok(decor.meta.includes("Clients/Acme"), "decorations should include folder context");
assert.ok(decor.meta.includes("#client"), "decorations should include tags in the meta line");

console.log("phase1 core tests passed");
