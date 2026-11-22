export function extractAliases(frontmatter: Record<string, unknown> | null | undefined): string[];
export function aliasMatches(
	frontmatter: Record<string, unknown> | null | undefined,
	query: string,
	options?: { ignoreDiacritics?: boolean }
): boolean;
