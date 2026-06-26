import assert from "assert";

function fuzzyMatch(query, text) {
	if (!query) return { score: 0, indices: [] };
	const q = query.toLowerCase();
	const t = text.toLowerCase();
	let qi = 0;
	let lastMatch = -1;
	let score = 0;
	const indices = [];
	for (let ti = 0; ti < t.length && qi < q.length; ti++) {
		if (t[ti] === q[qi]) {
			indices.push(ti);
			if (lastMatch === ti - 1) score += 8;
			else if (ti === 0 || /[\s\-_/]/.test(text[ti - 1] ?? "")) score += 12;
			else score += 4;
			lastMatch = ti;
			qi++;
		}
	}
	if (qi < q.length) return null;
	if (t.includes(q)) score += 20;
	if (t.startsWith(q)) score += 30;
	return { score, indices };
}

function tokenizeQuery(raw) {
	const trimmed = raw.trim();
	const contentMode = trimmed.startsWith(">");
	const body = contentMode ? trimmed.slice(1).trim() : trimmed;
	const parts = body.split(/\s+/).filter(Boolean);
	const textTokens = [];
	const tags = [];
	const properties = [];
	for (const part of parts) {
		if (part.startsWith("#") && part.length > 1) tags.push(part.slice(1).toLowerCase());
		else if (part.startsWith("@")) {
			const prop = part.slice(1);
			const colon = prop.indexOf(":");
			if (colon === -1) properties.push({ key: prop.toLowerCase(), value: null });
			else properties.push({ key: prop.slice(0, colon).toLowerCase(), value: prop.slice(colon + 1).toLowerCase() || null });
		} else textTokens.push(part.toLowerCase());
	}
	return { textTokens, tags, properties, contentMode };
}

const meeting = fuzzyMatch("meet", "Team Meeting Notes");
assert.ok(meeting && meeting.score > 0, "fuzzy match should score meeting");

const miss = fuzzyMatch("zzqx", "Team Meeting Notes");
assert.equal(miss, null, "non-matching query returns null");

const parsed = tokenizeQuery("> project #work @status:done");
assert.equal(parsed.contentMode, true);
assert.deepEqual(parsed.textTokens, ["project"]);
assert.deepEqual(parsed.tags, ["work"]);
assert.deepEqual(parsed.properties, [{ key: "status", value: "done" }]);

console.log("search tests passed");