import assert from "assert";
import { applyTagToMarkdown } from "../src/core/frontmatterTags.mjs";
import { buildResultMarkdown } from "../src/core/resultMarkdown.mjs";
import { activeProfile, normalizeProfiles } from "../src/core/searchProfiles.mjs";

const profiles = normalizeProfiles([
	{ id: "research", name: "Research", defaultMode: "content", defaultQuery: "> ai ethics", includeCanvas: true, includePdf: true, excludeFolders: ["Archive"] },
	{ id: "writing", name: "Writing", defaultMode: "files", defaultQuery: "Draft", includeCanvas: false, includePdf: false, excludeFolders: ["Templates"] },
]);
assert.equal(profiles.length, 2, "valid profiles should be preserved");
assert.equal(activeProfile(profiles, "research")?.defaultMode, "content", "active profile should resolve by id");
assert.equal(activeProfile(profiles, "missing"), null, "missing profile should resolve to null");

const withExistingFrontmatter = applyTagToMarkdown("---\ntags: [work]\nstatus: active\n---\nBody", "client");
assert.ok(withExistingFrontmatter.includes("tags: [work, client]"), "should append to inline frontmatter tags");
assert.ok(withExistingFrontmatter.includes("status: active"), "should preserve unrelated frontmatter");

const withoutFrontmatter = applyTagToMarkdown("Body text", "client");
assert.equal(withoutFrontmatter, "---\ntags: [client]\n---\nBody text", "should create frontmatter tags when missing");

const markdown = buildResultMarkdown([
	{ link: "[[Projects/Roadmap]]", suffix: " — L4: launch plan" },
	{ link: "[[Notes/Ideas]]" },
]);
assert.equal(markdown, "- [[Projects/Roadmap]] — L4: launch plan\n- [[Notes/Ideas]]", "should format result links consistently");

console.log("profile/core tests passed");
