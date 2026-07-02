import assert from "assert";
import { fuzzyMatch } from "../src/core/fuzzy.mjs";
import { parseAdvancedQuery } from "../src/core/advancedQuery.mjs";

// --- fuzzyMatch (the real implementation, not a copy) ---

const meeting = fuzzyMatch("meet", "Team Meeting Notes");
assert.ok(meeting && meeting.score > 0, "fuzzy match should score meeting");
assert.ok(meeting.indices.length === 4, "fuzzy match should return highlight indices");

const miss = fuzzyMatch("zzqx", "Team Meeting Notes");
assert.equal(miss, null, "non-matching query returns null");

const prefix = fuzzyMatch("team", "Team Meeting Notes");
const scattered = fuzzyMatch("tmn", "Team Meeting Notes");
assert.ok(prefix && scattered && prefix.score > scattered.score, "prefix match should outrank scattered match");

const typo = fuzzyMatch("dashbaord", "Dashboard");
assert.ok(typo && typo.score > 0, "typo within tolerance should still match");
assert.deepEqual(typo.indices, [], "typo fallback returns no highlight indices");

const shortTypo = fuzzyMatch("dax", "dog");
assert.equal(shortTypo, null, "short queries get no typo tolerance");

const empty = fuzzyMatch("", "Anything");
assert.deepEqual(empty, { score: 0, indices: [] }, "empty query matches everything at score 0");

// --- parseAdvancedQuery (backs tokenizeQuery; prefixes are stripped upstream) ---

const parsed = parseAdvancedQuery("project #work @status:done");
assert.deepEqual(parsed.textTokens, ["project"]);
assert.deepEqual(parsed.tags, ["work"]);
assert.deepEqual(parsed.properties, [{ key: "status", value: "done" }]);

const extParsed = parseAdvancedQuery("report ext:pdf ext:canvas");
assert.deepEqual(extParsed.extFilters, ["pdf", "canvas"]);
assert.deepEqual(extParsed.textTokens, ["report"]);

// A ">" that survives prefix-stripping (e.g. escaped "!>foo") is literal text,
// not a mode trigger — the double-strip bug regression test.
const literal = parseAdvancedQuery(">foo");
assert.deepEqual(literal.textTokens, [">foo"], "leading > must not be re-stripped");

const zeroDays = parseAdvancedQuery("notes modified:0");
assert.equal(zeroDays.modifiedDays, 1, "modified:0 should clamp to the last 24 hours, not exclude everything");

console.log("search tests passed");
