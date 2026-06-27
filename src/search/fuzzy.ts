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

	if (qi < q.length) return null;

	if (t.includes(q)) score += 20;
	if (t.startsWith(q)) score += 30;

	return { score, indices };
}

export function highlightMatches(text: string, indices: number[]): string {
	if (indices.length === 0) return escapeHtml(text);

	const set = new Set(indices);
	let out = "";
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (set.has(i)) {
			out += `<mark>${escapeHtml(ch)}</mark>`;
		} else {
			out += escapeHtml(ch);
		}
	}
	return out;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
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
		} else if (part.startsWith("@")) {
			const prop = part.slice(1);
			const colon = prop.indexOf(":");
			if (colon === -1) {
				properties.push({ key: prop.toLowerCase(), value: null });
			} else {
				const key = prop.slice(0, colon).toLowerCase();
				const value = prop.slice(colon + 1);
				properties.push({ key, value: value.length ? value.toLowerCase() : null });
			}
		} else {
			textTokens.push(part.toLowerCase());
		}
	}

	return { textTokens, tags, properties, extFilters, contentMode };
}