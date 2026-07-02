export interface FuzzyMatch {
	score: number;
	indices: number[];
}

import { fuzzyMatch as coreFuzzyMatch } from "../core/fuzzy.mjs";
import { parseAdvancedQuery } from "../core/advancedQuery.mjs";

// The matcher lives in core/fuzzy.mjs so Node tests exercise the real
// implementation; this wrapper only pins the TypeScript signature.
export const fuzzyMatch = coreFuzzyMatch as (query: string, text: string) => FuzzyMatch | null;

export function renderHighlightedText(parent: HTMLElement, text: string, indices: number[]): void {
	parent.empty();
	if (indices.length === 0) {
		parent.setText(text);
		return;
	}

	const set = new Set(indices);
	let i = 0;
	while (i < text.length) {
		const highlight = set.has(i);
		let j = i + 1;
		while (j < text.length && set.has(j) === highlight) {
			j++;
		}
		const chunk = text.slice(i, j);
		if (highlight) {
			parent.createEl("mark", { text: chunk });
		} else {
			parent.appendText(chunk);
		}
		i = j;
	}
}

export function tokenizeQuery(raw: string): {
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
} {
	// Mode prefixes (and the escape character) are already stripped by
	// resolveQuery/detectModeFromPrefix before the query reaches here — do NOT
	// strip again, or an escaped literal like "!>foo" loses its ">".
	return parseAdvancedQuery(raw.trim());
}
