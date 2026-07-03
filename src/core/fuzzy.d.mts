export interface FuzzyMatchOptions {
	ignoreDiacritics?: boolean;
}

export interface FuzzyMatchResult {
	score: number;
	indices: number[];
}

export function fuzzyMatch(query: string, text: string, options?: FuzzyMatchOptions): FuzzyMatchResult | null;
export function boundedLevenshtein(a: string, b: string, max: number): number;
