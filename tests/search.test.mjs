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

// An empty (or whitespace-only) query is "no match", not a truthy zero-score
// object: callers treat a falsy return as "skip", and a {score:0} would slip
// through that guard as a spurious zero-relevance hit.
assert.equal(fuzzyMatch("", "Anything"), null, "empty query is not a match");
assert.equal(fuzzyMatch("   ", "Anything"), null, "whitespace-only query is not a match");

// --- diacritic folding keeps highlight indices aligned to the ORIGINAL string ---
// Accented strings are assembled from char codes so the precomposed vs
// decomposed distinction is unambiguous in source (an editor could otherwise
// silently normalize a literal accent and defeat the point of the test).
const ACUTE_E = String.fromCharCode(0x00e9); // precomposed "é"
const COMBINING_ACUTE = String.fromCharCode(0x0301); // combining accent

// Precomposed: "caf" + é + " note". Folding the accent to "e" is
// length-preserving, but the returned indices must still index the ORIGINAL
// string ("note" at 5..8).
const precomposedText = "caf" + ACUTE_E + " note";
const precomposed = fuzzyMatch("note", precomposedText, { ignoreDiacritics: true });
assert.ok(precomposed && precomposed.score > 0, "precomposed accent matches when folding");
assert.deepEqual(precomposed.indices, [5, 6, 7, 8], "indices map onto the original precomposed string");

// Decomposed: "cafe" + combining acute + " note". The mark collapses away when
// folded, so a naive folded index is off by one; the map must land the
// highlight on "note" (original offsets 6..9), NOT the shifted " not". This is
// the macOS-supplied (NFD) filename case from the review.
const decomposedText = "cafe" + COMBINING_ACUTE + " note";
const decomposed = fuzzyMatch("note", decomposedText, { ignoreDiacritics: true });
assert.ok(decomposed && decomposed.score > 0, "decomposed accent matches when folding");
assert.deepEqual(decomposed.indices, [6, 7, 8, 9], "folded->original index map corrects the NFD shift");
assert.deepEqual(
	decomposed.indices.map((i) => decomposedText[i]),
	["n", "o", "t", "e"],
	"highlights the real characters, not shifted ones"
);

// The non-folded path is unchanged: an accented query matches its own text.
const noFold = fuzzyMatch("caf" + ACUTE_E, precomposedText);
assert.ok(noFold && noFold.score > 0, "non-folded path unaffected");

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

// Highlight indices must stay anchored to the ORIGINAL string even when a char's
// lowercase form is longer than one code unit (Turkish "İ" U+0130 → "i" + U+0307).
// A bulk toLowerCase() would shift every index after such a char (and overrun end).
const turkishI = fuzzyMatch("stan", "İstanbul");
assert.deepEqual(turkishI.indices, [1, 2, 3, 4], "İstanbul: 'stan' highlights s,t,a,n (not shifted right)");
const leadingI = fuzzyMatch("a", "İa");
assert.deepEqual(leadingI.indices, [1], "İa: 'a' highlights index 1, not an out-of-range 2");
assert.ok(
	fuzzyMatch("stan", "İstanbul").indices.every((i) => i < "İstanbul".length),
	"no highlight index may exceed the original string length"
);

console.log("search tests passed");
