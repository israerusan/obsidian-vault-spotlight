export interface FuzzyMatch {
	score: number;
	indices: number[];
}

export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
	if (!query) {
		return { score: 0, indices: [] };
	}

	const q = query.toLowerCase();
	const t = text.toLowerCase();
	let qi = 0;
	let lastMatch = -1;
	let score = 0;
	const indices: number[] = [];

	for (let ti = 0; ti < t.length && qi < q.length; ti++) {
		if (t[ti] === q[qi]) {
			indices.push(ti);
			if (lastMatch === ti - 1) {
				score += 8;
			} else if (ti === 0 || /[\s\-_/]/.test(text[ti - 1] ?? "")) {
				score += 12;
			} else {
				score += 4;
			}
			if (ti < 6) score += 2;
			lastMatch = ti;
			qi++;
		}
	}

	if (qi < q.length) {
		// Strict subsequence failed. Fall back to a bounded edit-distance check
		// so a small typo ("dashbaord" → "dashboard") still matches. Compare the
		// query against each word of the text; keep it cheap by only trying when
		// the query is long enough to make a typo meaningful.
		return typoFallback(q, text);
	}

	if (t.includes(q)) score += 20;
	if (t.startsWith(q)) score += 30;

	return { score, indices };
}

/**
 * Returns a low-scoring match (no highlight indices) when the query is within a
 * small edit distance of any word in the text, otherwise null. Tolerance scales
 * with query length: ~1 typo per 4 characters, and never for very short queries
 * where a single edit would match almost anything.
 */
function typoFallback(q: string, text: string): FuzzyMatch | null {
	if (q.length < 4) return null;
	const tolerance = q.length <= 5 ? 1 : q.length <= 9 ? 2 : 3;
	let best = Infinity;
	for (const word of text.toLowerCase().split(/[\s\-_/]+/)) {
		if (!word) continue;
		// Skip words whose length is too different to ever be within tolerance.
		if (Math.abs(word.length - q.length) > tolerance) continue;
		const d = boundedLevenshtein(q, word, tolerance);
		if (d < best) best = d;
		if (best === 0) break;
	}
	if (best > tolerance) return null;
	// Rank below any genuine subsequence match; penalise each edit.
	return { score: Math.max(1, 8 - best * 2), indices: [] };
}

/** Levenshtein distance, short-circuiting once it provably exceeds `max`. */
function boundedLevenshtein(a: string, b: string, max: number): number {
	const al = a.length;
	const bl = b.length;
	if (Math.abs(al - bl) > max) return max + 1;
	let prev = new Array(bl + 1);
	let curr = new Array(bl + 1);
	for (let j = 0; j <= bl; j++) prev[j] = j;
	for (let i = 1; i <= al; i++) {
		curr[0] = i;
		let rowMin = curr[0];
		for (let j = 1; j <= bl; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
			if (curr[j] < rowMin) rowMin = curr[j];
		}
		// Whole row already over budget → distance can only grow.
		if (rowMin > max) return max + 1;
		[prev, curr] = [curr, prev];
	}
	return prev[bl];
}

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
	tags: string[];
	properties: Array<{ key: string; value: string | null }>;
	extFilters: string[];
	contentMode: boolean;
} {
	const trimmed = raw.trim();
	const contentMode = trimmed.startsWith(">");
	const body = contentMode ? trimmed.slice(1).trim() : trimmed;
	const parts = body.split(/\s+/).filter(Boolean);
	const textTokens: string[] = [];
	const tags: string[] = [];
	const properties: Array<{ key: string; value: string | null }> = [];
	const extFilters: string[] = [];

	for (const part of parts) {
		if (part.startsWith("ext:") && part.length > 4) {
			extFilters.push(part.slice(4).toLowerCase());
		} else if (part.startsWith("#") && part.length > 1) {
			tags.push(part.slice(1).toLowerCase());
		} else if (part.startsWith("@") && part.length > 1) {
			const prop = part.slice(1);
			const colon = prop.indexOf(":");
			if (colon === -1) {
				properties.push({ key: prop.toLowerCase(), value: null });
			} else {
				const key = prop.slice(0, colon).toLowerCase();
				const value = prop.slice(colon + 1);
				// A bare "@key:" with no key is meaningless; skip it rather than
				// emitting an empty-key filter that excludes every file.
				if (key.length > 0) {
					properties.push({ key, value: value.length ? value.toLowerCase() : null });
				}
			}
		} else if (part === "#" || part === "@" || part === "ext:") {
			// Lone operator characters are no-ops, not literal search text.
			continue;
		} else {
			textTokens.push(part.toLowerCase());
		}
	}

	return { textTokens, tags, properties, extFilters, contentMode };
}