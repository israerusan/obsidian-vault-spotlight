import { getAllTags, parseFrontMatterTags, type CachedMetadata } from "obsidian";
import {
	fileMatchesTags as coreFileMatchesTags,
	frontmatterValueMatches as coreFrontmatterValueMatches,
	getFrontmatterValue as coreGetFrontmatterValue,
	normalizeTag as coreNormalizeTag,
} from "../core/metadataCore.mjs";

// Pure matching logic lives in core/metadataCore.mjs so Node tests exercise
// the real implementation; these wrappers only pin the TypeScript signatures.
export const normalizeTag = coreNormalizeTag as (tag: string) => string;
export const fileMatchesTags = coreFileMatchesTags as (
	fileTags: Set<string>,
	queryTags: string[]
) => boolean;
export const getFrontmatterValue = coreGetFrontmatterValue as (
	frontmatter: Record<string, unknown>,
	key: string
) => unknown;
export const frontmatterValueMatches = coreFrontmatterValueMatches as (
	raw: unknown,
	queryValue: string | null
) => boolean;

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
