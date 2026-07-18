/** One AND-clause of a parsed query — the flat field set that predates OR. */
export interface AdvancedQueryClause {
	textTokens: string[];
	/** Same words as textTokens, in their original (un-lowercased) case. */
	textTokensRaw: string[];
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

/**
 * A parsed query. The flat fields mirror the FIRST clause (so naive consumers
 * see one alternative), and `orClauses` is null unless the query used a top-level
 * uppercase `OR`, in which case it holds every clause (including clause 0) for
 * OR-aware engines to iterate with disjunctive-normal-form semantics.
 */
export interface AdvancedQuery extends AdvancedQueryClause {
	orClauses: AdvancedQueryClause[] | null;
}

export function parseAdvancedQuery(raw: string): AdvancedQuery;

/**
 * Split a content-search query into DNF groups (AND within a group, OR across
 * groups) plus the de-duplicated union of tokens for snippet highlighting.
 */
export function parseContentQuery(query: string): { groups: string[][]; tokens: string[] };
