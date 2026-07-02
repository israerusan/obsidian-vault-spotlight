export function normalizeTag(tag: string): string;
export function fileMatchesTags(fileTags: Set<string>, queryTags: string[]): boolean;
export function getFrontmatterValue(frontmatter: Record<string, unknown>, key: string): unknown;
export function frontmatterValueMatches(raw: unknown, queryValue: string | null): boolean;
