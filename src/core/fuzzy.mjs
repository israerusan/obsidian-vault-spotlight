export function fuzzyMatch(query, text) {
	if (!query) {
		return { score: 0, indices: [] };
	}

	const q = query.toLowerCase();
	const t = text.toLowerCase();
	let qi = 0;
	let lastMatch = -1;
	let score = 0;
	const indices = [];

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
function typoFallback(q, text) {
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
export function boundedLevenshtein(a, b, max) {
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
