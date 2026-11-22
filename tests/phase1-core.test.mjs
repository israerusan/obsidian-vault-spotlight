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
import { buildPreviewExcerpt, buildSnippetWindow } from "../src/core/previewWindow.mjs";

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

// Greek final sigma: ς and σ compare equal whichever side has which.
assert.ok(fuzzyMatch("ΟΔΟΣ", "ΟΔΟΣ")?.indices.length === 4, "uppercase Greek word matches itself with highlights");
assert.ok(fuzzyMatch("οδος", "ΟΔΟΣ")?.indices.length === 4, "lowercase σ query matches a final Σ");
assert.ok(fuzzyMatch("κεντρικη οδος", "ΚΕΝΤΡΙΚΗ ΟΔΟΣ"), "multi-word Greek title matches");

// Preview excerpt honours maxChars on a giant single-line note.
{
	const blob = "x".repeat(200000) + " needle " + "y".repeat(200000);
	const ex = buildPreviewExcerpt(blob, { terms: ["needle"] });
	assert.ok(ex.length <= 10000 + 10, "single-line note excerpt stays within budget (got " + ex.length + ")");
	assert.ok(ex.includes("needle"), "excerpt still contains the hit");
	const lined = Array.from({ length: 2000 }, (_, i) => "line " + i + " " + "z".repeat(20)).join("\n");
	const ex2 = buildPreviewExcerpt(lined, { terms: ["line 1500 "] });
	assert.ok(ex2.includes("line 1500 ") && ex2.startsWith("…\nline "), "multi-line excerpt still snaps to whole lines");
}

// Content snippet window: keep the prefix when the match is visible, else centre on it.
{
	const short = "a short line with needle";
	assert.equal(buildSnippetWindow(short, ["needle"]), short, "short lines are returned whole");
	const early = "needle " + "x".repeat(300);
	assert.equal(buildSnippetWindow(early, ["needle"]), early.slice(0, 160), "early match keeps the old prefix behaviour");
	const late = "y".repeat(500) + " needle " + "z".repeat(500);
	const w = buildSnippetWindow(late, ["needle"]);
	assert.ok(w.includes("needle") && w.startsWith("…") && w.endsWith("…"), "late match is windowed with ellipses");
	assert.equal(w.length, 162, "window is width + two ellipses");
	const tail = "y".repeat(500) + " needle";
	const wt = buildSnippetWindow(tail, ["needle"]);
	assert.ok(wt.endsWith("needle") && wt.startsWith("…") && wt.length === 161, "match at the end: window ends at the line end");
	assert.equal(buildSnippetWindow("q".repeat(300), ["absent"]), "q".repeat(160), "no match falls back to the prefix");
}

console.log("phase1 core tests passed");
