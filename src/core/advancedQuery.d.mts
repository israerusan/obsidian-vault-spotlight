export interface AdvancedQuery {
	textTokens: string[];
	phrases: string[];
	exclusions: string[];
	folderIncludes: string[];
	pathTerms: string[];
	nameTerms: string[];
	tags: string[];
	properties: Array<{ key: string; value: string | null }>;
	extFilters: string[];
	isStarred: boolean;
	isBookmarked: boolean;
	modifiedDays: number | null;
	createdDays: number | null;
}

export function parseAdvancedQuery(raw: string): AdvancedQuery;
