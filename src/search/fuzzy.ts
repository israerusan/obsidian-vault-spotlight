import { parseAdvancedQuery, type AdvancedQuery } from "../core/advancedQuery.mjs";

// The matcher lives in core/fuzzy.mjs (typed by core/fuzzy.d.mts) so Node
// tests exercise the real implementation.
export { fuzzyMatch } from "../core/fuzzy.mjs";
export type { FuzzyMatchResult as FuzzyMatch } from "../core/fuzzy.mjs";

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

export function tokenizeQuery(raw: string): AdvancedQuery {
	// Mode prefixes (and the escape character) are already stripped by
	// resolveQuery/detectModeFromPrefix before the query reaches here — do NOT
	// strip again, or an escaped literal like "!>foo" loses its ">".
	return parseAdvancedQuery(raw.trim());
}
