import assert from "assert";
import { parseAdvancedQuery } from "../src/core/advancedQuery.mjs";
import { addTagToTags, removeInlineTag, removeTagFromTags, tagsValueToList } from "../src/core/frontmatterTags.mjs";
import { buildMocMarkdown } from "../src/core/resultMarkdown.mjs";

const parsed = parseAdvancedQuery('"launch plan" -archive in:Projects name:roadmap tag:client prop:status=active modified:7d created:30d is:starred ext:md');
assert.deepEqual(parsed.phrases, ["launch plan"], "quoted phrases should be parsed");
assert.deepEqual(parsed.exclusions, ["archive"], "negative tokens should be parsed");
assert.deepEqual(parsed.folderIncludes, ["projects"], "in: folder filters should be parsed");
assert.deepEqual(parsed.nameTerms, ["roadmap"], "name: terms should be parsed");
assert.deepEqual(parsed.tags, ["client"], "tag: should map to tag filters");
assert.deepEqual(parsed.properties, [{ key: "status", value: "active" }], "prop: should map to property filters");
assert.equal(parsed.modifiedDays, 7, "modified:N should parse days");
assert.equal(parsed.createdDays, 30, "created:N should parse days");
assert.equal(parsed.isStarred, true, "is:starred should parse");
assert.deepEqual(parsed.extFilters, ["md"], "ext: should parse");

// Tag-list helpers are used inside app.fileManager.processFrontMatter, which
// owns the YAML serialization — they only transform the tags VALUE, so both
// inline and block-style frontmatter survive untouched.
assert.deepEqual(tagsValueToList(["work", "client"]), ["work", "client"], "array tags pass through");
assert.deepEqual(tagsValueToList("work, client"), ["work", "client"], "comma-string tags are split");
assert.deepEqual(tagsValueToList("#work"), ["work"], "hash prefixes are stripped");
assert.deepEqual(tagsValueToList(undefined), [], "missing tags become an empty list");

assert.deepEqual(removeTagFromTags(["work", "client"], "client"), ["work"], "should remove tag from list");
assert.equal(removeTagFromTags(["client"], "Client"), null, "emptied list signals property deletion");
assert.deepEqual(removeTagFromTags(["work"], "missing"), ["work"], "removing an absent tag is a no-op");

const inlineStripped = removeInlineTag("Body #client here\nAnd #client", "client");
assert.ok(!inlineStripped.includes("#client"), "should remove inline tag occurrences");
assert.ok(inlineStripped.includes("Body") && inlineStripped.includes("here"), "should keep surrounding text");
assert.ok(removeInlineTag("See #clients list", "client").includes("#clients"), "must not clip longer tags");

const moc = buildMocMarkdown([
	{ link: "[[Projects/Roadmap]]", folder: "Projects", tags: ["client"], snippet: "Launch plan" },
	{ link: "[[Meetings/Kickoff]]", folder: "Meetings", tags: ["client"], snippet: "Kickoff notes" },
], { title: "Client Index", groupBy: "folder", includeSnippets: true });
assert.ok(moc.includes("# Client Index"), "MOC should include title");
assert.ok(moc.includes("## Projects") && moc.includes("## Meetings"), "MOC should group by folder");
assert.ok(moc.includes("Launch plan"), "MOC should include snippets when requested");

assert.deepEqual(addTagToTags(["client"], "client"), ["client"], "adding existing tag should be idempotent");
assert.deepEqual(addTagToTags(["Client"], "client"), ["Client"], "idempotence is case-insensitive");
assert.deepEqual(addTagToTags(undefined, "client"), ["client"], "should create the tags list when missing");
assert.deepEqual(addTagToTags(["work"], "client"), ["work", "client"], "should append new tags");

console.log("workflow core tests passed");
