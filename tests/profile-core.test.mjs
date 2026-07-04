import assert from "assert";
import { addTagToTags } from "../src/core/frontmatterTags.mjs";
import { buildResultMarkdown } from "../src/core/resultMarkdown.mjs";
import { activeProfile, normalizeProfiles } from "../src/core/searchProfiles.mjs";

const profiles = normalizeProfiles([
	{ id: "research", name: "Research", defaultMode: "content", defaultQuery: "> ai ethics", includeCanvas: true, includePdf: true, excludeFolders: ["Archive"] },
	{ id: "writing", name: "Writing", defaultMode: "files", defaultQuery: "Draft", includeCanvas: false, includePdf: false, excludeFolders: ["Templates"] },
]);
assert.equal(profiles.length, 2, "valid profiles should be preserved");
assert.equal(activeProfile(profiles, "research")?.defaultMode, "content", "active profile should resolve by id");
assert.equal(activeProfile(profiles, "missing"), null, "missing profile should resolve to null");
assert.equal(profiles[0].includeBases, true, "profiles saved before Bases support default to including .base files");
assert.equal(
	normalizeProfiles([{ id: "x", name: "X", defaultMode: "files", includeBases: false }])[0].includeBases,
	false,
	"explicit includeBases: false survives normalization"
);

// Colliding slugified ids must be re-minted unique so settings remove/activate
// (which match by id) act on a single row, not several.
const dupProfiles = normalizeProfiles([
	{ id: "work", name: "Work" },
	{ id: "Work!", name: "Work again" },
]);
assert.equal(new Set(dupProfiles.map((p) => p.id)).size, 2, "colliding profile ids are re-minted unique");

assert.deepEqual(addTagToTags(["work"], "client"), ["work", "client"], "should append to existing frontmatter tags");
assert.deepEqual(addTagToTags(undefined, "client"), ["client"], "should create frontmatter tags when missing");

const markdown = buildResultMarkdown([
	{ link: "[[Projects/Roadmap]]", suffix: " — L4: launch plan" },
	{ link: "[[Notes/Ideas]]" },
]);
assert.equal(markdown, "- [[Projects/Roadmap]] — L4: launch plan\n- [[Notes/Ideas]]", "should format result links consistently");

console.log("profile/core tests passed");
