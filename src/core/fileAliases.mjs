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

// Same fold as core/fuzzy.mjs's stripDiacritics, so "Ignore diacritics" (whose
// setting text promises filenames AND aliases) treats both identically.
function foldDiacritics(value) {
	return String(value).normalize("NFD").replace(/\p{Diacritic}+/gu, "");
}

export function aliasMatches(frontmatter, query, options = {}) {
	const fold = options && options.ignoreDiacritics === true ? foldDiacritics : (s) => s;
	const q = fold(String(query || "")).toLowerCase().trim();
	if (!q) return false;
	return extractAliases(frontmatter).some((alias) => fold(alias).toLowerCase().includes(q));
}
