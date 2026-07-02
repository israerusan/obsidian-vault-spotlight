export interface FuzzyMatchResult {
	score: number;
	indices: number[];
}

export function fuzzyMatch(query: string, text: string): FuzzyMatchResult | null;
export function boundedLevenshtein(a: string, b: string, max: number): number;
