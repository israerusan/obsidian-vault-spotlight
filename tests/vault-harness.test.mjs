// Fixture-vault INTERACTION harness: bundles the real src/search/*.ts (obsidian
// aliased to a mock) and drives the actual searchers over an on-disk fixture vault
// — "type a query, verify the results" — rather than scanning source strings.
// Catches the search-layer regressions the string-scan tests could not (per-engine
// ordering, ripgrep recall/column parity, diacritics, exclusions).
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { buildHarness } from "./harness/build.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vaultDir = path.join(__dirname, "fixtures", "vault");

const outfile = await buildHarness();
const h = await import(pathToFileURL(outfile).href);
const { loadVaultApp, FileSearcher, ContentSearcher, HeadingSearcher, SymbolSearcher } = h;

const { app } = loadVaultApp(vaultDir);

// --- helpers ------------------------------------------------------------------
function fileSearch(overrides = {}) {
	return new FileSearcher(app).search({
		textTokens: [],
		phrases: [],
		exclusions: [],
		folderIncludes: [],
		pathTerms: [],
		nameTerms: [],
		tags: [],
		properties: [],
		extFilters: [],
		recentPaths: [],
		starredPaths: [],
		includeCanvas: false,
		includePdf: false,
		includeBases: false,
		limit: 50,
		...overrides,
	});
}
const content = new ContentSearcher(app, "rg");
const keyOf = (r) => `${r.file.path}:${r.line}`;

/** Write a throwaway one-file vault with `nLines` dense "gadget sprocket" lines. */
function makeDenseVault(nLines) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vs-recall-"));
	const body = Array.from({ length: nLines }, (_, i) => `gadget sprocket line ${i + 1}`).join("\n");
	fs.writeFileSync(path.join(dir, "Dense.md"), `# Dense\n\n${body}\n`);
	return dir;
}

// --- 1. File search: type a query, get the right note -------------------------
{
	const results = fileSearch({ textTokens: ["roadmap"] });
	assert.ok(results.length > 0, "file search for 'roadmap' returns something");
	assert.equal(results[0].file.basename, "Roadmap", "'roadmap' ranks Roadmap.md first");
}

// --- 1b. Ranking: prefix/full basename match beats a mid-word substring match --
{
	// Both "Launch.md" and "Pre-Launch Checklist.md" fuzzy-match "launch" on the
	// basename, but "Launch" is a full prefix match and must rank above the note
	// where "launch" appears mid-name. Catches a basename-scoring regression that a
	// single-candidate query cannot.
	const results = fileSearch({ textTokens: ["launch"] });
	const launchers = results.filter((r) => ["Launch", "Pre-Launch Checklist"].includes(r.file.basename));
	assert.equal(launchers.length, 2, "both launch-named notes match");
	assert.equal(launchers[0].file.basename, "Launch", "the full-prefix match ranks above the mid-word match");
}

// --- 2. Alias match (frontmatter aliases: [Brainstorm]) -----------------------
{
	const results = fileSearch({ textTokens: ["brainstorm"] });
	const ideas = results.find((r) => r.file.basename === "Ideas");
	assert.ok(ideas, "alias 'brainstorm' matches Ideas.md");
	assert.ok(ideas.aliasMatched, "the Ideas hit is flagged as an alias match");
}

// --- 3. Tag filter (tags: [meeting]) ------------------------------------------
{
	const results = fileSearch({ tags: ["meeting"] });
	assert.ok(
		results.some((r) => r.file.basename === "Meeting Notes"),
		"tag filter #meeting returns the meeting note"
	);
	assert.ok(
		!results.some((r) => r.file.basename === "Ideas"),
		"tag filter #meeting excludes non-meeting notes"
	);
}

// --- 4. Folder exclusion ------------------------------------------------------
{
	const browse = fileSearch({ excludeFolders: ["Archive"] });
	assert.ok(
		!browse.some((r) => r.file.path.startsWith("Archive/")),
		"excludeFolders hides Archive/* from file search"
	);
}

// --- 5. Heading search + diacritics plumbing (regression for the diacritics fix) --
{
	const launch = new HeadingSearcher(app).search("launch", { limit: 50 });
	assert.ok(launch.some((r) => r.heading === "Launch plan"), "heading search finds 'Launch plan'");

	const isCafe = (r) => r.file.basename.normalize("NFC") === "Café".normalize("NFC");
	const folded = new HeadingSearcher(app).search("cafe", { ignoreDiacritics: true, limit: 50 });
	const cafe = folded.find((r) => isCafe(r) && r.heading.normalize("NFC") === "Café".normalize("NFC"));
	assert.ok(cafe, "with ignoreDiacritics, 'cafe' matches the '## Café' heading");
	assert.ok(cafe.matchIndices.length > 0, "the folded match highlights real characters (fold actually applied)");

	// Negative complement: with folding OFF (the default), "cafe" only reaches
	// "Café" via the typo fallback, which returns NO highlight indices. If this
	// still produced indices, folding would be silently on regardless of the flag.
	const unfolded = new HeadingSearcher(app).search("cafe", { ignoreDiacritics: false, limit: 50 });
	const unfoldedCafe = unfolded.find((r) => isCafe(r) && r.heading.normalize("NFC") === "Café".normalize("NFC"));
	assert.ok(
		!unfoldedCafe || unfoldedCafe.matchIndices.length === 0,
		"without ignoreDiacritics the fold is genuinely off (no real subsequence highlight)"
	);
}

// --- 6. Symbol outline (active-note structure) --------------------------------
{
	const roadmap = app.vault.getMarkdownFiles().find((f) => f.basename === "Roadmap");
	const outline = new SymbolSearcher(app).search(roadmap, "", 100);
	const headings = outline.filter((s) => s.symbolType === "heading").map((s) => s.text);
	assert.deepEqual(
		headings,
		["Roadmap", "Launch plan", "Risks"],
		"symbol outline lists headings in document order"
	);
}

// --- 7. Content search: multi-token AND, in-process fallback ------------------
{
	const results = await content.search("action item", { useRipgrep: false, includeCanvas: false });
	assert.ok(results.length >= 2, "'action item' matches both notes that use the phrase");
	for (const r of results) {
		const low = r.snippet.toLowerCase();
		assert.ok(low.includes("action") && low.includes("item"), "every content hit contains BOTH tokens (line-level AND)");
	}
	// Non-vacuous AND: Signals.md has "action" and "item" on SEPARATE lines, so an
	// OR (or broken AND) would surface it. A correct line-level AND must not.
	assert.ok(
		!results.some((r) => r.file.path === "Signals.md"),
		"a note with the tokens on different lines is NOT an 'action item' match (real AND)"
	);
	// …and prove that line IS in the index: a single-token search does find it.
	const single = await content.search("action", { useRipgrep: false, includeCanvas: false });
	assert.ok(
		single.some((r) => r.file.path === "Signals.md"),
		"the 'action'-only line is indexed and returned for a single-token query"
	);
}

// --- 8. Recall: a dense single file is not per-file truncated (fallback) ------
{
	const results = await content.search("widget", { useRipgrep: false, includeCanvas: false, limit: 50 });
	const fromRecall = results.filter((r) => r.file.path === "Recall.md");
	assert.equal(fromRecall.length, 12, "all 12 'widget' lines in Recall.md are returned (no per-file cap)");
}

// --- 8b. Recall boundary (the review's missing coverage): a dense single file
// returns up to the FULL requested limit, far beyond the old per-file caps (single
// 4 / multi 40). NOTE the bounded residual: a file with more than max(limit*10, 500)
// anchor-only lines BEFORE a late multi-token match can still be omitted under rg's
// --max-count — a known, documented limitation, not a silent one.
{
	const dir = makeDenseVault(55);
	try {
		const dense = new ContentSearcher(loadVaultApp(dir).app, "rg");
		const single = await dense.search("gadget", { useRipgrep: false, limit: 50 });
		assert.equal(single.length, 50, "fallback single-token: dense file yields the full limit (old cap was 4)");
		assert.ok(single.every((r) => r.file.path === "Dense.md"), "all matches come from the one dense file");
		const multi = await dense.search("gadget sprocket", { useRipgrep: false, limit: 50 });
		assert.equal(multi.length, 50, "fallback multi-token: dense file yields the full limit (old cap was 40)");
		dense.dispose();
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

// --- 9. Long-line retention: a match past column 500 survives (max-columns=2000) --
{
	const results = await content.search("sentinelword", { useRipgrep: false, includeCanvas: false });
	assert.ok(
		results.some((r) => r.file.path === "Wide.md"),
		"a token in columns 501-2000 of a long line is still found (fallback line cap is 2000)"
	);
}

// --- 10. Canvas + Base structure search --------------------------------------
{
	const canvas = await content.search("widget", { useRipgrep: false, includeCanvas: true });
	assert.ok(canvas.some((r) => r.engine === "canvas"), "canvas node text is searchable");

	const base = await content.search("revenue", { useRipgrep: false, includeBases: true });
	assert.ok(base.some((r) => r.engine === "base"), "base view/formula text is searchable");
}

// --- 11. Exclusion applies to content search too ------------------------------
{
	const results = await content.search("launch", { useRipgrep: false, excludeFolders: ["Archive"] });
	assert.ok(results.length > 0, "'launch' still matches non-excluded notes");
	assert.ok(!results.some((r) => r.file.path.startsWith("Archive/")), "Archive/* is excluded from content search");
}

// --- 12. Deterministic ordering (compareContentRows is stable) ----------------
{
	const a = (await content.search("launch", { useRipgrep: false })).map(keyOf);
	const b = (await content.search("launch", { useRipgrep: false })).map(keyOf);
	assert.deepEqual(a, b, "identical queries return identically-ordered results");
}

// --- 13. Ripgrep integration: recall, column-parity, and ordering vs fallback --
// Probe rg availability INDEPENDENTLY (not via the searcher) so the ripgrep-specific
// regression coverage can't silently no-op: if rg is installed, the checks are
// mandatory; only a genuinely rg-less machine skips them (loudly).
const rgInstalled = (() => {
	try {
		return spawnSync("rg", ["--version"], { encoding: "utf8" }).status === 0;
	} catch {
		return false;
	}
})();

if (rgInstalled) {
	// Give the bundle a `window.require`/`window.process` so RipgrepSearcher can
	// feature-detect child_process and shell out to rg against the fixture vault.
	globalThis.window = { require: createRequire(import.meta.url), process };
	const rgSearcher = new ContentSearcher(app, "rg");

	const viaRg = await rgSearcher.search("action item", { useRipgrep: true, includeCanvas: false });
	assert.ok(
		viaRg.some((r) => r.engine === "ripgrep"),
		"rg is installed, so ContentSearcher must actually use ripgrep — not silently fall back"
	);
	// Ordered parity (not just set): rg and the fallback must agree on order too,
	// which is exactly what the shared (score, path, line) comparator guarantees.
	const viaFallback = await content.search("action item", { useRipgrep: false, includeCanvas: false });
	assert.deepEqual(
		viaRg.map(keyOf),
		viaFallback.map(keyOf),
		"ripgrep and the in-process fallback return identically-ordered results"
	);

	// Recall fix (#3): with the old per-file --max-count of 4, rg would return only
	// 4 of Recall.md's 12 'widget' lines. (Empirically fails when the fix is reverted.)
	const rgWidget = await rgSearcher.search("widget", { useRipgrep: true, includeCanvas: false, limit: 50 });
	assert.ok(rgWidget.some((r) => r.engine === "ripgrep"), "widget search ran through ripgrep");
	assert.equal(
		rgWidget.filter((r) => r.file.path === "Recall.md").length,
		12,
		"ripgrep returns all 12 dense matches from one file (per-file cap raised)"
	);

	// Column-parity fix (#4): both tokens sit past column 500; with the old
	// --max-columns of 500 they'd fall outside rg's preview and the AND filter drops them.
	const rgWide = await rgSearcher.search("sentinelword deepmatch", { useRipgrep: true, includeCanvas: false });
	assert.ok(rgWide.some((r) => r.engine === "ripgrep"), "wide-line search ran through ripgrep");
	assert.ok(
		rgWide.some((r) => r.file.path === "Wide.md"),
		"ripgrep finds a multi-token match past column 500 (--max-columns aligned to 2000)"
	);

	// Recall boundary under REAL rg: a dense single file returns the full limit
	// through ripgrep too — the old per-file caps (4 single / 40 multi) truncated it.
	const denseDir = makeDenseVault(55);
	try {
		const denseRg = new ContentSearcher(loadVaultApp(denseDir).app, "rg");
		const dSingle = await denseRg.search("gadget", { useRipgrep: true, limit: 50 });
		assert.ok(dSingle.some((r) => r.engine === "ripgrep"), "dense single-token ran through rg");
		assert.equal(dSingle.length, 50, "rg single-token: dense file yields the full limit (old cap was 4)");
		const dMulti = await denseRg.search("gadget sprocket", { useRipgrep: true, limit: 50 });
		assert.equal(dMulti.length, 50, "rg multi-token: dense file yields the full limit (old cap was 40)");
		denseRg.dispose();
	} finally {
		fs.rmSync(denseDir, { recursive: true, force: true });
	}

	rgSearcher.dispose();
	delete globalThis.window;
	console.log("  (ripgrep engine used: recall + column + ordered-parity all enforced against rg)");
} else {
	console.log("  (rg not installed on this machine — ripgrep-specific checks skipped)");
}

content.dispose();
console.log("vault harness tests passed");
