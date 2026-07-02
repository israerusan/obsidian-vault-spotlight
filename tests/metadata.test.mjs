import assert from "assert";
import {
	fileMatchesTags,
	frontmatterValueMatches,
	getFrontmatterValue,
	normalizeTag,
} from "../src/core/metadataCore.mjs";

// --- tag normalization and matching (the real implementation, not a copy) ---

assert.equal(normalizeTag("#Journal"), "journal", "strips hash and lowercases");
assert.equal(normalizeTag("Daily"), "daily", "lowercases plain tags");

const tags = new Set(["journal", "daily", "personal", "projects/client"]);
assert.ok(fileMatchesTags(tags, ["journal"]), "exact tag query matches");
assert.ok(fileMatchesTags(tags, ["jour"]), "prefix tag query matches");
assert.ok(fileMatchesTags(tags, ["projects"]), "parent of nested tag matches");
assert.ok(fileMatchesTags(tags, ["client"]), "nested tag segment matches");
assert.ok(!fileMatchesTags(tags, ["work"]), "missing tag query fails");
assert.ok(fileMatchesTags(tags, ["journal", "daily"]), "all query tags must match (AND)");
assert.ok(!fileMatchesTags(tags, ["journal", "work"]), "one missing tag fails the whole query");

// --- frontmatter property access and matching ---

const fm = { Tags: ["Journal", "Daily"], status: "done", nested: { assignee: "Ana" } };
assert.deepEqual(getFrontmatterValue(fm, "tags"), ["Journal", "Daily"], "case-insensitive property keys");
assert.equal(getFrontmatterValue(fm, "missing"), undefined, "missing property returns undefined");
assert.ok(frontmatterValueMatches(fm.Tags, "journal"), "array property values match");
assert.ok(frontmatterValueMatches(fm.status, "done"), "string property values match");
assert.ok(!frontmatterValueMatches(fm.status, "wip"), "non-matching property values fail");
assert.ok(frontmatterValueMatches(fm.nested, "ana"), "object property values match by JSON content");
assert.ok(frontmatterValueMatches(fm.status, null), "key-only query matches any present value");
assert.ok(!frontmatterValueMatches(undefined, null), "key-only query fails when property is absent");

console.log("metadata tests passed");
