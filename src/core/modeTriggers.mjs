export const DEFAULT_MODE_PREFIXES = {
	content: ">",
	commands: ":",
	headings: "^",
	symbols: "$",
	links: "~",
	editors: "=",
	folders: "/",
	capture: "+",
	snippets: ";",
};

export const DEFAULT_ESCAPE_CHAR = "!";

/**
 * Sanitize a user-supplied prefix map: every value must be a short, non-blank
 * string with no whitespace, and no two modes may share a prefix. Invalid or
 * duplicate entries fall back to the defaults.
 */
export function normalizeModePrefixes(raw) {
	const out = { ...DEFAULT_MODE_PREFIXES };
	if (!raw || typeof raw !== "object") return out;
	const taken = new Set();
	// If a custom prefix steals another mode's default, the displaced mode
	// gets the first free spare so no two modes ever share a trigger.
	const spares = ["`", ",", "'", "?", "%", "&", "*"];
	for (const mode of Object.keys(DEFAULT_MODE_PREFIXES)) {
		const value = typeof raw[mode] === "string" ? raw[mode].trim() : "";
		let next =
			value.length > 0 && value.length <= 4 && !/\s/.test(value) && !taken.has(value)
				? value
				: DEFAULT_MODE_PREFIXES[mode];
		if (taken.has(next)) next = spares.find((c) => !taken.has(c)) ?? next;
		out[mode] = next;
		taken.add(next);
	}
	return out;
}

export function normalizeEscapeChar(raw) {
	const value = typeof raw === "string" ? raw.trim() : "";
	return value.length === 1 && !/\s/.test(value) ? value : DEFAULT_ESCAPE_CHAR;
}

/**
 * The escape char is checked BEFORE mode prefixes (see detectModeFromPrefix), so
 * if it collides with a live prefix that mode becomes unreachable. Resolve a
 * normalized escape char against the current prefix map: keep it if free, else
 * fall back to the default, else the first free spare. Shared by loadSettings
 * and the settings tab so a live edit can never silently kill a search mode.
 */
export function reconcileEscapeChar(escapeChar, modePrefixes) {
	const escape = normalizeEscapeChar(escapeChar);
	const taken = new Set(Object.values(modePrefixes || {}));
	if (!taken.has(escape)) return escape;
	if (!taken.has(DEFAULT_ESCAPE_CHAR)) return DEFAULT_ESCAPE_CHAR;
	return ["\\", "|", "?", "%", "&"].find((c) => !taken.has(c)) ?? DEFAULT_ESCAPE_CHAR;
}

/**
 * Detect the search mode a raw query selects via its leading prefix.
 * Returns { mode, body, escaped }:
 * - escaped: query started with the escape char → treat the rest literally in files mode
 * - mode: matched mode name, or null when no prefix matched (caller keeps its Tab-cycled mode)
 * - body: the query text with the prefix/escape removed
 * Longer prefixes win over shorter ones so custom prefixes like ">>" work.
 */
export function detectModeFromPrefix(raw, prefixes = DEFAULT_MODE_PREFIXES, escapeChar = DEFAULT_ESCAPE_CHAR) {
	const trimmed = String(raw ?? "").trimStart();
	if (escapeChar && trimmed.startsWith(escapeChar)) {
		return { mode: null, body: trimmed.slice(escapeChar.length).trimStart(), escaped: true };
	}
	let best = null;
	for (const [mode, prefix] of Object.entries(prefixes || {})) {
		if (!prefix || !trimmed.startsWith(prefix)) continue;
		if (!best || prefix.length > best.prefix.length) best = { mode, prefix };
	}
	if (!best) return { mode: null, body: trimmed, escaped: false };
	return { mode: best.mode, body: trimmed.slice(best.prefix.length).trimStart(), escaped: false };
}

/**
 * Parse a headings-mode query supporting `file#heading` scoping and
 * `level:N` / `level:N-M` depth filters anywhere in the query.
 * With no `#`, the whole query matches headings (existing behavior).
 */
export function parseHeadingQuery(raw) {
	let levelMin = null;
	let levelMax = null;
	const withoutLevels = String(raw ?? "")
		.split(/\s+/)
		.filter((token) => {
			const match = token.toLowerCase().match(/^level:(\d)(?:-(\d))?$/);
			if (!match) return true;
			const a = Number(match[1]);
			const b = match[2] !== undefined ? Number(match[2]) : a;
			levelMin = Math.max(1, Math.min(a, b));
			levelMax = Math.min(6, Math.max(a, b));
			// Out-of-range inputs (level:0, level:7) clamp to an empty span
			// (min > max) that would silently match no headings — treat those
			// as no level filter instead of returning nothing with no reason.
			if (levelMin > levelMax) {
				levelMin = null;
				levelMax = null;
			}
			return false;
		})
		.join(" ")
		.trim();

	const hash = withoutLevels.indexOf("#");
	if (hash === -1) {
		return { fileQuery: "", headingQuery: withoutLevels, levelMin, levelMax };
	}
	return {
		fileQuery: withoutLevels.slice(0, hash).trim(),
		headingQuery: withoutLevels.slice(hash + 1).trim(),
		levelMin,
		levelMax,
	};
}

/** Most-recent-first, de-duplicated, capped list of executed command ids. */
export function pushRecentCommand(recentIds, id, max = 25) {
	const cleaned = (Array.isArray(recentIds) ? recentIds : []).filter(
		(existing) => typeof existing === "string" && existing !== id
	);
	cleaned.unshift(id);
	return cleaned.slice(0, max);
}

/** The previous file to toggle back to: first recent path that is not the active one. */
export function previousFilePath(recentPaths, activePath) {
	for (const path of Array.isArray(recentPaths) ? recentPaths : []) {
		if (path !== activePath) return path;
	}
	return null;
}
