function lineStart(text, index) {
	if (index <= 0) return 0;
	const at = text.lastIndexOf("\n", index - 1);
	return at === -1 ? 0 : at + 1;
}

function lineEnd(text, index) {
	const at = text.indexOf("\n", index);
	return at === -1 ? text.length : at;
}

function firstNeedleIndex(haystack, needles) {
	const lower = haystack.toLowerCase();
	let best = -1;
	for (const needle of needles) {
		const clean = String(needle ?? "").trim().toLowerCase();
		if (!clean) continue;
		const at = lower.indexOf(clean);
		if (at !== -1 && (best === -1 || at < best)) best = at;
	}
	return best;
}

export function buildPreviewExcerpt(content, { focusText = "", terms = [], maxChars = 10000, contextChars = 2500 } = {}) {
	const text = String(content ?? "");
	if (text.length <= maxChars) return text;

	const focusNeedles = [focusText, ...terms];
	const hit = firstNeedleIndex(text, focusNeedles);
	if (hit === -1) return text.slice(0, maxChars);

	let start = Math.max(0, hit - contextChars);
	let end = Math.min(text.length, start + maxChars);
	if (end === text.length) start = Math.max(0, end - maxChars);

	start = lineStart(text, start);
	end = lineEnd(text, end);

	const prefix = start > 0 ? "…\n" : "";
	const suffix = end < text.length ? "\n…" : "";
	return `${prefix}${text.slice(start, end).trimStart()}${suffix}`;
}
