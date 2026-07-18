// Any code unit outside 7-bit ASCII. Gates the lowercase/fold fast paths: within
// ASCII, an equal-length transform is guaranteed to be a 1:1 index map; outside it,
// it is not (final sigma, cancelling fold expand/contract) — see lowerWithMap/foldWithMap.
const NON_ASCII = /[^\x00-\x7f]/;

export function fuzzyMatch(query, text, options = {}) {
	// An empty/whitespace-only query is "no match", not a zero-score match: every
	// caller treats a falsy return as "skip", but a truthy {score:0} object would
	// pass that guard and add a spurious zero-relevance hit (e.g. FileSearcher would
	// set primaryMatch="filename" for an empty name: term). Return null so the
	// empty case can never masquerade as a match.
	if (!query || !String(query).trim()) {
		return null;
	}

	const ignoreDiacritics = options.ignoreDiacritics === true;
	const q = (ignoreDiacritics ? stripDiacritics(query) : String(query)).toLowerCase();
	// When folding diacritics, positions in the folded string no longer line up
	// with the original (decomposed NFD combining marks collapse away, so every
	// character after an accent shifts). Match against the folded text but keep a
	// folded→original index map so the highlight indices we return point at the
	// right characters of the ORIGINAL string.
	// Both paths keep a transformed→original index map so highlight indices point
	// at the right characters of the ORIGINAL string. Plain toLowerCase() is not
	// length-preserving either (e.g. "İ" U+0130 lowercases to "i" + combining dot),
	// so without a map every index after such a char would shift — and can run past
	// the string end. lowerWithMap handles that the same way foldWithMap handles NFD.
	const transformed = ignoreDiacritics ? foldWithMap(text) : lowerWithMap(text);
	const t = transformed.folded;
	const indexMap = transformed.map;
	let qi = 0;
	let lastMatch = -1;
	let score = 0;
	const indices = [];

	for (let ti = 0; ti < t.length && qi < q.length; ti++) {
		if (t[ti] === q[qi]) {
			// indexMap is null on the fast path (length-preserving transform), where the
			// folded index IS the original index — see lowerWithMap/foldWithMap.
			indices.push(indexMap ? indexMap[ti] : ti);
			if (lastMatch === ti - 1) {
				score += 8;
			} else if (ti === 0 || /[\s\-_/]/.test(t[ti - 1] ?? "")) {
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
		return typoFallback(q, t);
	}

	if (t.includes(q)) score += 20;
	if (t.startsWith(q)) score += 30;

	return { score, indices };
}

/**
 * Diacritic-fold + lowercase a string one ORIGINAL code unit at a time, tracking
 * which original index each folded output character came from. A decomposed
 * accent (base char + combining mark) collapses to a single folded char, and a
 * bare combining mark folds to nothing — both stay correctly mapped so match
 * indices can be translated back to the original string for highlighting.
 */
function foldWithMap(value) {
	const str = String(value);
	// Fast path: fold the whole string at once and skip the per-character index map.
	// Restricted to ASCII: outside ASCII, a length-preserving fold can still shift
	// indices when an expansion and a contraction cancel out (e.g. a base char that
	// keeps a non-diacritic combining mark alongside a standalone diacritic that folds
	// to nothing), which would misplace highlight marks. No ASCII code point expands
	// under stripDiacritics+lowercase, so within ASCII equal length ⇒ a true 1:1 map.
	// Any non-ASCII text falls through to the already-correct mapped path.
	const bulk = stripDiacritics(str).toLowerCase();
	if (bulk.length === str.length && !NON_ASCII.test(str)) return { folded: bulk, map: null };
	let folded = "";
	const map = [];
	for (let i = 0; i < str.length; i++) {
		const piece = stripDiacritics(str[i]).toLowerCase();
		for (let j = 0; j < piece.length; j++) {
			folded += piece[j];
			map.push(i);
		}
	}
	return { folded, map };
}

/**
 * Lowercase a string one ORIGINAL code unit at a time, tracking which original
 * index each lowercased output character came from. Same shape as foldWithMap
 * (so callers can treat both uniformly), but without the diacritic strip. This
 * keeps highlight indices aligned when a character's lowercase form is longer
 * than one code unit (e.g. "İ" → "i" + U+0307), which a bulk toLowerCase() would
 * silently shift.
 */
function lowerWithMap(value) {
	const str = String(value);
	// Fast path: lowercase the whole string at once and skip the per-character index
	// map. Restricted to ASCII: whole-string toLowerCase can differ from per-character
	// lowercasing outside ASCII (e.g. Greek context-sensitive final sigma Σ→ς, which is
	// length-preserving yet changes which characters match), so a non-ASCII string must
	// use the per-character path to stay byte-for-byte identical to the old behaviour.
	const bulk = str.toLowerCase();
	if (bulk.length === str.length && !NON_ASCII.test(str)) return { folded: bulk, map: null };
	let folded = "";
	const map = [];
	for (let i = 0; i < str.length; i++) {
		const piece = str[i].toLowerCase();
		for (let j = 0; j < piece.length; j++) {
			folded += piece[j];
			map.push(i);
		}
	}
	return { folded, map };
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

function stripDiacritics(value) {
	return String(value).normalize("NFD").replace(/\p{Diacritic}+/gu, "");
}
