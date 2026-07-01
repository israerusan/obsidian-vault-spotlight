import assert from "assert";
import { parseAdvancedQuery } from "../src/core/advancedQuery.mjs";
import { applyTagToMarkdown, removeTagFromMarkdown, setFrontmatterProperty } from "../src/core/frontmatterTags.mjs";
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

const removed = removeTagFromMarkdown("---\ntags: [work, client]\n---\nBody #client", "client");
assert.ok(removed.includes("tags: [work]"), "should remove tag from inline frontmatter list");
assert.ok(!removed.includes("#client"), "should remove inline tag occurrences");

const updated = setFrontmatterProperty("---\nstatus: active\n---\nBody", "owner", "Israel");
assert.ok(updated.includes("owner: Israel"), "should add a new frontmatter property");
assert.ok(updated.includes("status: active"), "should preserve existing property");

const created = setFrontmatterProperty("Body", "status", "waiting");
assert.equal(created, "---\nstatus: waiting\n---\nBody", "should create frontmatter when missing");

const moc = buildMocMarkdown([
	{ link: "[[Projects/Roadmap]]", folder: "Projects", tags: ["client"], snippet: "Launch plan" },
	{ link: "[[Meetings/Kickoff]]", folder: "Meetings", tags: ["client"], snippet: "Kickoff notes" },
], { title: "Client Index", groupBy: "folder", includeSnippets: true });
assert.ok(moc.includes("# Client Index"), "MOC should include title");
assert.ok(moc.includes("## Projects") && moc.includes("## Meetings"), "MOC should group by folder");
assert.ok(moc.includes("Launch plan"), "MOC should include snippets when requested");

const idempotent = applyTagToMarkdown("---\ntags: [client]\n---\nBody", "client");
assert.equal(idempotent, "---\ntags: [client]\n---\nBody", "adding existing tag should be idempotent");

console.log("workflow core tests passed");
