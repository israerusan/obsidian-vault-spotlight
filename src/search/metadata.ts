import { getAllTags, parseFrontMatterTags, type CachedMetadata } from "obsidian";

export function normalizeTag(tag: string): string {
	return tag.replace(/^#/, "").toLowerCase();
}

export function collectFileTags(cache: CachedMetadata): Set<string> {
	const tags = new Set<string>();

	for (const tag of getAllTags(cache) ?? []) {
		tags.add(normalizeTag(tag));
	}

	for (const entry of cache.tags ?? []) {
		tags.add(normalizeTag(entry.tag));
	}

	for (const tag of parseFrontMatterTags(cache.frontmatter ?? null) ?? []) {
		tags.add(normalizeTag(tag));
	}

	return tags;
}

export function fileMatchesTags(fileTags: Set<string>, queryTags: string[]): boolean {
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

export function getFrontmatterValue(
	frontmatter: Record<string, unknown>,
	key: string
): unknown {
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

export function frontmatterValueMatches(raw: unknown, queryValue: string | null): boolean {
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