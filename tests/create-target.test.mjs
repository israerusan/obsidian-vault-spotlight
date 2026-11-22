import assert from "assert";
import { parseAdvancedQuery } from "../src/core/advancedQuery.mjs";
import { resolveCreateTarget, normalizeFolder } from "../src/core/createTarget.mjs";

const folders = ["/", "Projects", "Client Projects", "Projects/Sub", "Archive"];
const list = () => folders;
const resolve = (q) => resolveCreateTarget(parseAdvancedQuery(q), list);

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

assert.equal(normalizeFolder("/"), "");
assert.equal(normalizeFolder(" a\\b/ "), "a/b");

console.log("create-target tests passed");
