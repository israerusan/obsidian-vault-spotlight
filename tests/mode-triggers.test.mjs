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
