export function normalizeTag(tag) {
	return tag.replace(/^#/, "").toLowerCase();
}

export function fileMatchesTags(fileTags, queryTags) {
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

export function getFrontmatterValue(frontmatter, key) {
	if (Object.prototype.hasOwnProperty.call(frontmatter, key)) {
		return frontmatter[key];
	}

	const lower = key.toLowerCase();
	for (const entryKey of Object.keys(frontmatter)) {
		if (entryKey.toLowerCase() === lower) {
			return frontmatter[entryKey];
		}
	}

	return undefined;
}

export function frontmatterValueMatches(raw, queryValue) {
	if (raw === undefined || raw === null) return false;
	if (queryValue === null) return true;

	if (Array.isArray(raw)) {
		return raw.some((item) => String(item).toLowerCase().includes(queryValue));
	}

	if (typeof raw === "object") {
		return JSON.stringify(raw).toLowerCase().includes(queryValue);
	}

	return String(raw).toLowerCase().includes(queryValue);
}
