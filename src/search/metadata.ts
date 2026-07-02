import { getAllTags, parseFrontMatterTags, type CachedMetadata } from "obsidian";
import { normalizeTag } from "../core/metadataCore.mjs";

// Pure matching logic lives in core/metadataCore.mjs (typed by its .d.mts) so
// Node tests exercise the real implementation.
export {
	fileMatchesTags,
	frontmatterValueMatches,
	getFrontmatterValue,
	normalizeTag,
} from "../core/metadataCore.mjs";

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
