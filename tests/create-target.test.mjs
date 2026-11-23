import assert from "assert";
import { parseAdvancedQuery } from "../src/core/advancedQuery.mjs";
import { resolveCreateTarget, normalizeFolder, hasQueryFilters } from "../src/core/createTarget.mjs";

const folders = ["/", "Projects", "Client Projects", "Projects/Sub", "Archive"];
const list = () => folders;
const resolveFull = (q) => resolveCreateTarget(parseAdvancedQuery(q), list);
// Most assertions only care about folder + name.
const resolve = (q) => {
	const { folder, name } = resolveFull(q);
	return { folder, name };
};

// Browsing into a folder (Enter on a folder row) sets `in:"<path>" ` — Shift+Enter
// then creates inside it, with the original-case folder path and no filter leak.
assert.deepEqual(resolve(`in:"Client Projects" Meeting Notes`), { folder: "Client Projects", name: "Meeting Notes" });
assert.deepEqual(resolve(`in:"Projects" Kickoff`), { folder: "Projects", name: "Kickoff" });
assert.deepEqual(resolve(`in:projects/sub idea #draft`), { folder: "Projects/Sub", name: "idea" }, "nested, case-insensitive, tag stripped");
assert.deepEqual(resolve(`in:"Projects/" Kickoff`), { folder: "Projects", name: "Kickoff" }, "trailing slash tolerated");

// Folder browse with no text yet: folder resolved, empty name (caller prompts).
assert.deepEqual(resolve(`in:"Projects" `), { folder: "Projects", name: "" });

// No / ambiguous / partial in: → default location.
assert.equal(resolve(`Meeting Notes`).folder, null, "no filter");
assert.equal(resolve(`in:Projects in:Archive x`).folder, null, "two filters are ambiguous");
assert.equal(resolve(`in:Proj x`).folder, null, "a partial folder match never routes the note");
assert.equal(resolve(`in:Missing x`).folder, null, "unknown folder");

// The folder list is only consulted when there's exactly one in: filter.
let scanned = false;
resolveCreateTarget(parseAdvancedQuery("plain words"), () => {
	scanned = true;
	return folders;
});
assert.equal(scanned, false, "no vault scan without an in: filter");

// hasFilters: any filter fragment means "name from the plain words", even when an
// in: filter only partially matches and so doesn't route the note (Shift+Enter leak).
assert.deepEqual(resolveFull(`in:Proj Kickoff`), { folder: null, name: "Kickoff", hasFilters: true });
assert.equal(resolveFull(`roadmap #project`).hasFilters, true, "#tag");
assert.equal(resolveFull(`notes ext:md`).hasFilters, true, "ext:");
assert.equal(resolveFull(`notes -draft`).hasFilters, true, "exclusion");
assert.equal(resolveFull(`notes modified:7d`).hasFilters, true, "modified:");
assert.equal(resolveFull(`is:starred notes`).hasFilters, true, "is:starred");
assert.equal(resolveFull(`Meeting Notes`).hasFilters, false, "plain words");
assert.equal(resolveFull(`"Meeting Notes"`).hasFilters, false, "a quoted phrase is not a filter");
assert.equal(resolveFull(`Q3 - plan`).hasFilters, false, "a lone dash is text");
assert.equal(hasQueryFilters({ folderIncludes: [], textTokensRaw: [] }), false, "partial shape never throws");

// Round-2 review: filters hidden in a later OR clause, and syntax tokens whose value
// is invalid or empty (they set no field) must still count as filters.
assert.deepEqual(resolveFull(`Roadmap OR #tag`), { folder: null, name: "Roadmap", hasFilters: true }, "filter in a later OR clause");
assert.equal(resolveFull(`Roadmap OR Plan`).hasFilters, false, "OR of plain words alone is not a filter");
assert.equal(resolveFull(`Roadmap OR Plan`).name, "Roadmap Plan", "words from every OR clause");
assert.equal(resolveFull(`Roadmap modified:bogus`).hasFilters, true, "invalid modified: value");
assert.equal(resolveFull(`Roadmap created:??`).hasFilters, true, "invalid created: value");
assert.equal(resolveFull(`Roadmap ext:`).hasFilters, true, "empty ext:");
assert.equal(resolveFull(`Roadmap #`).hasFilters, true, "bare #");
assert.equal(resolveFull(`Roadmap @`).hasFilters, true, "bare @");
assert.equal(resolveFull(`Roadmap modified:bogus`).name, "Roadmap");

// Round-4 review: a bare, half-typed prefix is syntax (never part of the name), and
// OR clauses naming different folders never route the note.
assert.deepEqual(resolveFull(`Zzqx in:`), { folder: null, name: "Zzqx", hasFilters: true }, "bare in:");
assert.equal(resolveFull(`Zzqx tag:`).name, "Zzqx", "bare tag:");
for (const prefix of ["in:", "path:", "name:", "tag:", "prop:", "ext:", "modified:", "created:", "is:", "is:foo", "#", "@"]) {
	const r = resolveFull(`Meeting ${prefix}`);
	assert.equal(r.name, "Meeting", `bare/unknown ${prefix} stays out of the name`);
	assert.equal(r.hasFilters, true, `bare/unknown ${prefix} counts as syntax`);
}
assert.equal(resolveFull(`in:Projects Zzqx OR in:Archive Qqzx`).folder, null, "different folders per OR clause");
assert.equal(resolveFull(`in:Projects Zzqx OR in:projects Qqzx`).folder, "Projects", "same folder in every clause");
assert.equal(resolveFull(`in:Projects Zzqx OR Qqzx`).folder, null, "a clause without in: is not routed");

assert.equal(normalizeFolder("/"), "");
assert.equal(normalizeFolder(" a\\b/ "), "a/b");

console.log("create-target tests passed");
