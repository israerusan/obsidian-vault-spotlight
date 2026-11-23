export interface AdvancedQueryLike {
	folderIncludes: string[];
	textTokensRaw: string[];
	pathTerms?: string[];
	nameTerms?: string[];
	tags?: string[];
	properties?: unknown[];
	extFilters?: string[];
	exclusions?: string[];
	modifiedDays?: number | null;
	createdDays?: number | null;
	isStarred?: boolean;
	isBookmarked?: boolean;
	hasFilterTokens?: boolean;
	/** OR alternatives; every clause is checked for filters and contributes words. */
	orClauses?: AdvancedQueryLike[] | null;
}

export function resolveCreateTarget(
	parsed: AdvancedQueryLike,
	listFolderPaths: () => Iterable<string>
): { folder: string | null; name: string; hasFilters: boolean };

export function hasQueryFilters(parsed: AdvancedQueryLike): boolean;

export function normalizeFolder(path: string | null | undefined): string;
