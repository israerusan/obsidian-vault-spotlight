import assert from "assert";
import { fuzzyMatch } from "../src/core/fuzzy.mjs";
import { parseAdvancedQuery, parseContentQuery } from "../src/core/advancedQuery.mjs";

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

// textTokensRaw mirrors textTokens but preserves the ORIGINAL case, so the
// "Create <name>" dead-end row builds a filename with the user's capitalization
// (and without the filter fragments) instead of force-lowercasing it.
const cased = parseAdvancedQuery("Meeting Notes 2026 #project");
assert.deepEqual(cased.textTokens, ["meeting", "notes", "2026"], "textTokens stay lowercased for matching");
assert.deepEqual(cased.textTokensRaw, ["Meeting", "Notes", "2026"], "textTokensRaw preserves typed case and drops the #tag");
assert.equal(cased.textTokensRaw.join(" "), "Meeting Notes 2026", "create-row name keeps case, strips filters");

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

// The lowercase/fold fast path is guarded to ASCII only: outside ASCII an
// equal-length transform is NOT a 1:1 index map, and taking the fast path there
// would change matches or misplace highlights. These pin the two proven cases.
//
// Greek context-sensitive final sigma: "ΑΣ".toLowerCase() === "ας" (final sigma
// U+03C2, same length), but a typed σ is U+03C3. A whole-string-lowercase fast
// path would make this miss; the per-character path folds Σ→σ and matches.
const finalSigma = fuzzyMatch("σ", "ΑΣ");
assert.ok(finalSigma && finalSigma.indices.length === 1 && finalSigma.indices[0] === 1, "Greek final sigma Σ still matches a typed σ");

// A composed char that folds to a non-diacritic combining mark (kept) beside a
// standalone diacritic that folds to nothing: net length is preserved, yet the
// original indices shift. The highlight for 'x' must point at its real index (1),
// not slide onto the trailing mark.
const cancel = fuzzyMatch("x", "آx´", { ignoreDiacritics: true });
assert.ok(cancel && cancel.indices.length === 1 && cancel.indices[0] === 1, "cancelling fold expand/contract keeps the highlight on the real char");

// --- Boolean OR (parseAdvancedQuery) ---

// No OR: orClauses is null and every flat field is populated exactly as before,
// so existing consumers are byte-for-byte unchanged.
const noOr = parseAdvancedQuery("foo bar");
assert.equal(noOr.orClauses, null, "a query without OR has orClauses null");
assert.deepEqual(noOr.textTokens, ["foo", "bar"], "no-OR flat fields unchanged");

// OR splits into clauses; flat fields mirror clause 0; orClauses holds all.
const orQuery = parseAdvancedQuery("foo OR bar");
assert.ok(Array.isArray(orQuery.orClauses) && orQuery.orClauses.length === 2, "foo OR bar -> two clauses");
assert.deepEqual(orQuery.orClauses[0].textTokens, ["foo"], "clause 0 is foo");
assert.deepEqual(orQuery.orClauses[1].textTokens, ["bar"], "clause 1 is bar");
assert.deepEqual(orQuery.textTokens, ["foo"], "flat fields mirror clause 0");

// AND survives inside a clause: (foo AND bar) OR baz.
const mixed = parseAdvancedQuery("foo bar OR baz");
assert.equal(mixed.orClauses.length, 2, "foo bar OR baz -> two clauses");
assert.deepEqual(mixed.orClauses[0].textTokens, ["foo", "bar"], "clause 0 keeps AND");
assert.deepEqual(mixed.orClauses[1].textTokens, ["baz"], "clause 1 is baz");

// Filters split across clauses too.
const tagOr = parseAdvancedQuery("tag:a OR tag:b");
assert.deepEqual(tagOr.orClauses[0].tags, ["a"], "tag clause 0");
assert.deepEqual(tagOr.orClauses[1].tags, ["b"], "tag clause 1");

// A quoted "OR" is a literal phrase, not a separator.
const quotedOr = parseAdvancedQuery('"OR" note');
assert.equal(quotedOr.orClauses, null, "quoted OR does not split");
assert.deepEqual(quotedOr.phrases, ["or"], "quoted OR is a phrase");
assert.deepEqual(quotedOr.textTokens, ["note"], "note stays a text token");

// Lowercase "or" is an ordinary text token (natural language), not a separator.
const lowerOr = parseAdvancedQuery("cats or dogs");
assert.equal(lowerOr.orClauses, null, "lowercase or does not split");
assert.deepEqual(lowerOr.textTokens, ["cats", "or", "dogs"], "lowercase or is text");

// Empty trailing/leading/double OR collapses to no-OR.
assert.equal(parseAdvancedQuery("foo OR").orClauses, null, "trailing OR collapses");
assert.equal(parseAdvancedQuery("OR foo").orClauses, null, "leading OR collapses");
assert.deepEqual(parseAdvancedQuery("foo OR").textTokens, ["foo"], "trailing OR keeps foo");

// --- parseContentQuery (content-engine DNF split) ---

assert.deepEqual(parseContentQuery("a OR b").groups, [["a"], ["b"]], "a OR b -> two groups");
assert.deepEqual(parseContentQuery("a OR b").tokens, ["a", "b"], "union of tokens for highlighting");
assert.deepEqual(parseContentQuery("a b").groups, [["a", "b"]], "a b -> one AND group");
assert.deepEqual(parseContentQuery("A OR B").groups, [["a"], ["b"]], "uppercase OR separates, tokens lowercased");
assert.deepEqual(parseContentQuery("cats or dogs").groups, [["cats", "or", "dogs"]], "lowercase or is a token");
assert.deepEqual(parseContentQuery("   ").groups, [], "blank query -> no groups");
assert.deepEqual(parseContentQuery("foo OR").groups, [["foo"]], "trailing OR drops the empty group");

console.log("search tests passed");
