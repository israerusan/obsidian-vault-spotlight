import assert from "assert";

function normalizeTag(tag) {
	return tag.replace(/^#/, "").toLowerCase();
}

function collectFileTags(cache) {
	const tags = new Set();
	for (const tag of cache.getAllTags ?? []) tags.add(normalizeTag(tag));
	for (const entry of cache.tags ?? []) tags.add(normalizeTag(entry.tag));
	for (const tag of cache.frontmatterTags ?? []) tags.add(normalizeTag(tag));
	return tags;
}

function fileMatchesTags(fileTags, queryTags) {
	for (const queryTag of queryTags) {
		if (fileTags.has(queryTag)) continue;
		const hasMatch = [...fileTags].some((tag) => {
			if (tag === queryTag) return true;
			if (tag.startsWith(`${queryTag}/`)) return true;
			return tag.split("/").some((part) => part === queryTag || part.startsWith(queryTag));
		});
		if (!hasMatch) return false;
	}
	return true;
}

function getFrontmatterValue(frontmatter, key) {
	if (Object.prototype.hasOwnProperty.call(frontmatter, key)) return frontmatter[key];
	const lower = key.toLowerCase();
	for (const entryKey of Object.keys(frontmatter)) {
		if (entryKey.toLowerCase() === lower) return frontmatter[entryKey];
	}
	return undefined;
}

function frontmatterValueMatches(raw, queryValue) {
	if (raw === undefined || raw === null) return false;
	if (queryValue === null) return true;
	if (Array.isArray(raw)) {
		return raw.some((item) => String(item).toLowerCase().includes(queryValue));
	}
	return String(raw).toLowerCase().includes(queryValue);
}

const journalCache = {
	getAllTags: ["Journal", "Daily"],
	tags: [{ tag: "#Personal" }],
	frontmatterTags: [],
};

const tags = collectFileTags(journalCache);
assert.ok(tags.has("journal"), "normalizes getAllTags values");
assert.ok(tags.has("daily"), "keeps inline tags");
assert.ok(tags.has("personal"), "strips hash from tag cache entries");
assert.ok(fileMatchesTags(tags, ["journal"]), "exact tag query matches");
assert.ok(fileMatchesTags(tags, ["jour"]), "prefix tag query matches");
assert.ok(!fileMatchesTags(tags, ["work"]), "missing tag query fails");

const fm = { Tags: ["Journal", "Daily"], status: "done" };
assert.deepEqual(getFrontmatterValue(fm, "tags"), ["Journal", "Daily"], "case-insensitive property keys");
assert.equal(getFrontmatterValue(fm, "missing"), undefined, "missing property returns undefined");
assert.ok(frontmatterValueMatches(fm.Tags, "journal"), "array property values match");
assert.ok(frontmatterValueMatches(fm.status, "done"), "string property values match");
assert.ok(!frontmatterValueMatches(fm.status, "wip"), "non-matching property values fail");

console.log("metadata tests passed");