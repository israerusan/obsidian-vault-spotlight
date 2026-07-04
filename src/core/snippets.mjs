/**
 * Reusable text snippets with a tiny placeholder engine. The modal resolves the
 * dynamic values (date/time/clipboard/selection) and passes them in, so this
 * stays pure and the placeholder substitution is unit-tested.
 */

export const MAX_SNIPPETS = 100;

let counter = 0;

/** A stable-ish id without depending on crypto (tests + older runtimes). */
function nextId(seed) {
	counter += 1;
	return `sn-${seed}-${counter}`;
}

/** Coerce arbitrary stored data into a clean snippet array. */
export function normalizeSnippets(raw) {
	if (!Array.isArray(raw)) return [];
	const seen = new Set();
	const out = [];
	for (const entry of raw) {
		if (!entry || typeof entry !== "object") continue;
		const name = typeof entry.name === "string" ? entry.name.trim() : "";
		const body = typeof entry.body === "string" ? entry.body : "";
		// Only a name is required — an empty body is a valid work-in-progress
		// snippet the user is still editing in settings; dropping it on reload
		// would be silent data loss.
		if (name.length === 0) continue;
		let id = typeof entry.id === "string" && entry.id.length > 0 ? entry.id : nextId(name.length);
		while (seen.has(id)) id = nextId(name.length);
		seen.add(id);
		out.push({ id, name, body });
		if (out.length >= MAX_SNIPPETS) break;
	}
	return out;
}

/** Build a new snippet record. */
export function createSnippet(name, body) {
	return { id: nextId(String(name ?? "").length), name: String(name ?? "").trim(), body: String(body ?? "") };
}

/**
 * Expand a snippet body, substituting placeholders and reporting where the
 * caret should land.
 *
 * Supported: {{date}} {{time}} {{clipboard}} {{selection}} {{cursor}}.
 * Unknown placeholders are left untouched so typos are visible rather than
 * silently eaten. {{cursor}} is removed and its position returned as
 * `cursorOffset` (defaults to end of text when absent).
 *
 * @param {string} body
 * @param {{ date?: string, time?: string, clipboard?: string, selection?: string }} [ctx]
 * @returns {{ text: string, cursorOffset: number }}
 */
export function expandSnippet(body, ctx = {}) {
	const values = {
		date: ctx.date ?? "",
		time: ctx.time ?? "",
		clipboard: ctx.clipboard ?? "",
		selection: ctx.selection ?? "",
	};
	const substitute = (segment) =>
		String(segment).replace(/\{\{(date|time|clipboard|selection)\}\}/g, (_, key) => values[key]);

	// Locate {{cursor}} in the RAW body first, so a literal {{cursor}} that later
	// arrives via clipboard/selection content is never mistaken for the caret.
	const raw = String(body ?? "");
	const cursorToken = "{{cursor}}";
	const idx = raw.indexOf(cursorToken);
	if (idx === -1) {
		const text = substitute(raw);
		return { text, cursorOffset: text.length };
	}
	// Only the first {{cursor}} anchors the caret; drop any others from the body.
	const before = substitute(raw.slice(0, idx));
	const after = substitute(raw.slice(idx + cursorToken.length).split(cursorToken).join(""));
	return { text: before + after, cursorOffset: before.length };
}
