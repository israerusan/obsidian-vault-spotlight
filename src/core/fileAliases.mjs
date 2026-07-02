export function extractAliases(frontmatter) {
	if (!frontmatter || typeof frontmatter !== "object") return [];
	const raw = [];
	for (const key of ["aliases", "alias"]) {
		const value = frontmatter[key];
		if (Array.isArray(value)) raw.push(...value);
		else if (value !== undefined && value !== null) raw.push(value);
	}
	return raw.map((value) => String(value).trim()).filter(Boolean);
}

export function aliasMatches(frontmatter, query) {
	const q = String(query || "").toLowerCase().trim();
	if (!q) return false;
	return extractAliases(frontmatter).some((alias) => alias.toLowerCase().includes(q));
}
