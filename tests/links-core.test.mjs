import assert from "assert";
import { findBacklinks, findOutlinks, findRelatedBySharedTags } from "../src/core/linkGraph.mjs";
import { extractAliases, aliasMatches } from "../src/core/fileAliases.mjs";
import { detectSearchIntegrations } from "../src/core/integrations.mjs";

const files = [
	{ path: "Projects/Roadmap.md", basename: "Roadmap" },
	{ path: "Meetings/Kickoff.md", basename: "Kickoff" },
	{ path: "People/Ada.md", basename: "Ada" },
];
const resolvedLinks = {
	"Meetings/Kickoff.md": { "Projects/Roadmap.md": 1, "People/Ada.md": 1 },
	"People/Ada.md": { "Projects/Roadmap.md": 2 },
	"Projects/Roadmap.md": { "People/Ada.md": 1 },
};

assert.deepEqual(
	findBacklinks(files, resolvedLinks, "Projects/Roadmap.md").map((f) => f.path),
	["People/Ada.md", "Meetings/Kickoff.md"],
	"backlinks should be ranked by link count then path"
);
assert.deepEqual(
	findOutlinks(files, resolvedLinks, "Meetings/Kickoff.md").map((f) => f.path),
	["People/Ada.md", "Projects/Roadmap.md"],
	"outlinks should resolve destination paths"
);

assert.deepEqual(extractAliases({ aliases: ["CRM", "Client Dashboard"], alias: "Sales" }), ["CRM", "Client Dashboard", "Sales"]);
assert.equal(aliasMatches({ aliases: ["Client Dashboard"] }, "client"), true, "frontmatter aliases should match partial queries");
assert.equal(aliasMatches({ aliases: ["Client Dashboard"] }, "finance"), false, "unrelated aliases should not match");

const related = findRelatedBySharedTags([
	{ path: "a.md", tags: ["client", "active"] },
	{ path: "b.md", tags: ["client"] },
	{ path: "c.md", tags: ["active", "client"] },
	{ path: "d.md", tags: ["misc"] },
], "a.md");
assert.deepEqual(related.map((r) => r.path), ["c.md", "b.md"], "related notes should rank by shared tag count");

const integrations = detectSearchIntegrations(["omnisearch", "text-extractor", "calendar"]);
assert.equal(integrations.omnisearch, true, "should detect Omnisearch plugin id");
assert.equal(integrations.textExtractor, true, "should detect Text Extractor plugin id");
assert.equal(integrations.basesPowerPack, false, "should not report Bases Power Pack when absent");
assert.equal(
	detectSearchIntegrations(["Bases-Power-Pack"]).basesPowerPack,
	true,
	"should detect Bases Power Pack case-insensitively"
);

console.log("links/core tests passed");
