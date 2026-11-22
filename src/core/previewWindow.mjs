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

	// Snap each edge to a whole line for a clean excerpt — but only when the
	// newline is close. A huge single-line note (minified/pasted blob) has no
	// newline near the window, so snapping would expand it to the WHOLE line
	// (hundreds of KB handed to MarkdownRenderer on the UI thread). Each edge is
	// judged on its own, so one long line on one side doesn't stop the other side
	// snapping.
	const snappedStart = lineStart(text, start);
	const snappedEnd = lineEnd(text, end);
	if (start - snappedStart <= contextChars) start = snappedStart;
	if (snappedEnd - end <= contextChars) end = snappedEnd;

	const prefix = start > 0 ? "…\n" : "";
	const suffix = end < text.length ? "\n…" : "";
	return `${prefix}${text.slice(start, end).trimStart()}${suffix}`;
}

/**
 * Cut a content-search row's display snippet out of its (trimmed, capped) line.
 * Every engine (in-process, worker, ripgrep, canvas, base) returns the whole
 * trimmed line and ContentSearcher windows it here, in ONE place, so the rule
 * can't drift between engines. Previously each engine kept the first 160
 * characters, so a match past column 160 showed a snippet without the match
 * (and nothing highlighted).
 *
 * A match inside the first `width` characters keeps the original behaviour (the
 * line's prefix). Otherwise the window starts `lead` characters before the first
 * matching token, with "…" marking the cut ends.
 */
export function buildSnippetWindow(line, tokens, { width = 160, lead = 40 } = {}) {
	const text = String(line ?? "");
	if (text.length <= width) return text;
	const low = text.toLowerCase();
	let at = -1;
	let len = 0;
	for (const token of Array.isArray(tokens) ? tokens : []) {
		if (!token) continue;
		const i = low.indexOf(token);
		if (i !== -1 && (at === -1 || i < at)) {
			at = i;
			len = token.length;
		}
	}
	if (at === -1 || at + len <= width) return text.slice(0, width);
	let start = Math.max(0, at - lead);
	const end = Math.min(text.length, start + width);
	if (end === text.length) start = Math.max(0, end - width);
	return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}
