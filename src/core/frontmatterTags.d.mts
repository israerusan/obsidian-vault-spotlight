export function normalizeTag(raw: unknown): string;
export function tagsValueToList(value: unknown): string[];
export function addTagToTags(value: unknown, rawTag: string): string[];
export function removeTagFromTags(value: unknown, rawTag: string): string[] | null;
export function removeInlineTag(markdown: string, rawTag: string): string;
