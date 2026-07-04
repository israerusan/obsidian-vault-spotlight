import assert from "assert";
import {
	DEFAULT_MODE_PREFIXES,
	DEFAULT_ESCAPE_CHAR,
	detectModeFromPrefix,
	normalizeEscapeChar,
	normalizeModePrefixes,
	parseHeadingQuery,
	previousFilePath,
	pushRecentCommand,
	reconcileEscapeChar,
} from "../src/core/modeTriggers.mjs";
import { parseAdvancedQuery } from "../src/core/advancedQuery.mjs";

// --- detectModeFromPrefix ---

assert.deepEqual(detectModeFromPrefix("> meeting notes"), {
	mode: "content",
	body: "meeting notes",
	escaped: false,
});
assert.deepEqual(detectModeFromPrefix(": toggle"), { mode: "commands", body: "toggle", escaped: false });
assert.deepEqual(detectModeFromPrefix("^ roadmap"), { mode: "headings", body: "roadmap", escaped: false });
assert.deepEqual(detectModeFromPrefix("$setup"), { mode: "symbols", body: "setup", escaped: false });
assert.deepEqual(detectModeFromPrefix("~"), { mode: "links", body: "", escaped: false });
assert.deepEqual(detectModeFromPrefix("=daily"), { mode: "editors", body: "daily", escaped: false });
assert.deepEqual(detectModeFromPrefix("/projects"), { mode: "folders", body: "projects", escaped: false });

// No prefix → mode null, body preserved
assert.deepEqual(detectModeFromPrefix("plain query"), { mode: null, body: "plain query", escaped: false });

// Escape char forces a literal files search
assert.deepEqual(detectModeFromPrefix("!>literal"), { mode: null, body: ">literal", escaped: true });

// Longest prefix wins (custom ">>" vs ">")
const custom = { ...DEFAULT_MODE_PREFIXES, headings: ">>" };
assert.deepEqual(detectModeFromPrefix(">>deep", custom), { mode: "headings", body: "deep", escaped: false });
assert.deepEqual(detectModeFromPrefix(">shallow", custom), { mode: "content", body: "shallow", escaped: false });

// --- normalizeModePrefixes ---

// Duplicates fall back; blank/whitespace rejected; prefixes always stay unique
const normalized = normalizeModePrefixes({ content: ":", commands: ":", headings: " ", symbols: "$$" });
assert.equal(normalized.content, ":", "first claim on a prefix wins");
assert.equal(normalized.headings, DEFAULT_MODE_PREFIXES.headings, "blank prefix falls back");
assert.equal(normalized.symbols, "$$", "multi-char prefix allowed");
const prefixValues = Object.values(normalized);
assert.equal(new Set(prefixValues).size, prefixValues.length, "no two modes share a trigger");
assert.deepEqual(normalizeModePrefixes(null), DEFAULT_MODE_PREFIXES);

// A duplicate that collides with an already-assigned default is rejected
const collide = normalizeModePrefixes({ commands: ">" });
assert.equal(collide.commands, DEFAULT_MODE_PREFIXES.commands, "cannot steal content's default prefix");

assert.equal(normalizeEscapeChar("?"), "?");
assert.equal(normalizeEscapeChar(""), DEFAULT_ESCAPE_CHAR);
assert.equal(normalizeEscapeChar("ab"), DEFAULT_ESCAPE_CHAR);

// --- reconcileEscapeChar (escape char must never equal a live mode prefix) ---

// No collision → the (normalized) intended char is kept
assert.equal(reconcileEscapeChar("?", DEFAULT_MODE_PREFIXES), "?");
assert.equal(reconcileEscapeChar("!", DEFAULT_MODE_PREFIXES), "!");
// Escape char equals the content trigger ">" → falls back to the default "!"
assert.equal(reconcileEscapeChar(">", DEFAULT_MODE_PREFIXES), DEFAULT_ESCAPE_CHAR);
// Collision AND the default "!" is itself taken as a prefix → first free spare
const escapeTaken = { ...DEFAULT_MODE_PREFIXES, content: ">", folders: "!" };
const spare = reconcileEscapeChar(">", escapeTaken);
assert.notEqual(spare, ">", "must not stay on the colliding char");
assert.notEqual(spare, "!", "must not pick a char already used as a prefix");
assert.ok(!Object.values(escapeTaken).includes(spare), "spare is free of all prefixes");
// Blank/garbage input normalizes first, then reconciles
assert.equal(reconcileEscapeChar("", DEFAULT_MODE_PREFIXES), DEFAULT_ESCAPE_CHAR);
// An escape char that is a PROPER PREFIX of a multi-char trigger also shadows it:
// detectModeFromPrefix checks the escape (via startsWith) BEFORE any prefix, so
// escape "!" with a trigger "!!" makes every "!!…" query parse as escaped and the
// "!!" mode unreachable. Reconcile must treat that as a collision, not just exact
// equality.
const prefixCollide = { ...DEFAULT_MODE_PREFIXES, headings: "!!" };
const reconciledPrefix = reconcileEscapeChar("!", prefixCollide);
assert.notEqual(reconciledPrefix, "!", "escape that is a prefix of a trigger is reconciled away");
assert.ok(
	!Object.values(prefixCollide).some((p) => p.startsWith(reconciledPrefix)),
	"reconciled escape is not a prefix of any trigger"
);
// With the reconciled escape, "!!deep" now reaches the headings mode again.
assert.deepEqual(detectModeFromPrefix("!!deep", prefixCollide, reconciledPrefix), {
	mode: "headings",
	body: "deep",
	escaped: false,
});
// Even when many single-char triggers are in use, reconcile returns a char that is
// free of EVERY trigger — never a still-colliding fallback.
const crowded = {
	content: "!", commands: "\\", headings: "|", symbols: "?", links: "%",
	editors: "&", folders: "#", capture: "@", snippets: "*",
};
const freeEscape = reconcileEscapeChar("!", crowded);
assert.ok(
	!Object.values(crowded).some((p) => p.startsWith(freeEscape)),
	"reconciled escape is free of every trigger even when the common spares are taken"
);

// --- parseHeadingQuery ---

assert.deepEqual(parseHeadingQuery("roadmap#setup"), {
	fileQuery: "roadmap",
	headingQuery: "setup",
	levelMin: null,
	levelMax: null,
});
assert.deepEqual(parseHeadingQuery("just headings"), {
	fileQuery: "",
	headingQuery: "just headings",
	levelMin: null,
	levelMax: null,
});
assert.deepEqual(parseHeadingQuery("intro level:2"), {
	fileQuery: "",
	headingQuery: "intro",
	levelMin: 2,
	levelMax: 2,
});
assert.deepEqual(parseHeadingQuery("level:1-3 roadmap # setup"), {
	fileQuery: "roadmap",
	headingQuery: "setup",
	levelMin: 1,
	levelMax: 3,
});
// Reversed range is normalized
assert.deepEqual(parseHeadingQuery("level:3-1"), { fileQuery: "", headingQuery: "", levelMin: 1, levelMax: 3 });
// Out-of-range levels (0, 7+) would clamp to an empty span and silently match
// nothing — they drop the filter instead so the rest of the query still runs.
assert.deepEqual(parseHeadingQuery("intro level:0"), {
	fileQuery: "",
	headingQuery: "intro",
	levelMin: null,
	levelMax: null,
});
assert.deepEqual(parseHeadingQuery("intro level:7"), {
	fileQuery: "",
	headingQuery: "intro",
	levelMin: null,
	levelMax: null,
});
// Multi-digit level tokens are now parsed (\d+) and clamped, instead of falling
// through as a plain search token. level:10 clamps above the 6 ceiling → empty
// span → filter dropped (same treatment as level:7).
assert.deepEqual(parseHeadingQuery("intro level:10"), {
	fileQuery: "",
	headingQuery: "intro",
	levelMin: null,
	levelMax: null,
});
// A multi-digit upper bound clamps into range rather than being ignored.
assert.deepEqual(parseHeadingQuery("level:2-10"), {
	fileQuery: "",
	headingQuery: "",
	levelMin: 2,
	levelMax: 6,
});

// --- pushRecentCommand ---

assert.deepEqual(pushRecentCommand([], "a"), ["a"]);
assert.deepEqual(pushRecentCommand(["a", "b"], "b"), ["b", "a"], "re-run moves to front");
assert.deepEqual(pushRecentCommand(["a", "b", "c"], "d", 3), ["d", "a", "b"], "cap enforced");
assert.deepEqual(pushRecentCommand(null, "x"), ["x"], "tolerates corrupt input");

// --- previousFilePath ---

assert.equal(previousFilePath(["active.md", "prev.md"], "active.md"), "prev.md");
assert.equal(previousFilePath(["other.md"], "active.md"), "other.md");
assert.equal(previousFilePath([], "active.md"), null);
assert.equal(previousFilePath(["active.md"], "active.md"), null);

// --- advancedQuery inline quoting (in:"folder with spaces") ---

const quoted = parseAdvancedQuery('in:"Client Projects" report');
assert.deepEqual(quoted.folderIncludes, ["client projects"]);
assert.deepEqual(quoted.textTokens, ["report"]);

const plainPhrase = parseAdvancedQuery('"launch plan" -archive');
assert.deepEqual(plainPhrase.phrases, ["launch plan"], "standalone quoted phrases still work");
assert.deepEqual(plainPhrase.exclusions, ["archive"]);

console.log("mode-trigger tests passed");
