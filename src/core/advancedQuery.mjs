export function parseAdvancedQuery(raw) {
	const tokens = tokenizeAdvanced(raw);
	// Split the token stream into OR-separated groups on a standalone, unquoted,
	// UPPERCASE "OR". A quoted "OR" stays a phrase and a lowercase "or" stays an
	// ordinary text token, so the English word "or" in a natural query is never
	// hijacked (Google/GitHub convention). Empty groups from a leading, trailing,
	// or doubled OR are dropped.
	const groups = [];
	let group = [];
	for (const token of tokens) {
		if (!token.quoted && token.value.trim() === "OR") {
			if (group.length) groups.push(group);
			group = [];
			continue;
		}
		group.push(token);
	}
	if (group.length) groups.push(group);

	// No usable tokens (empty query, or only OR separators): return an empty clause
	// with orClauses null so every existing no-OR consumer is byte-for-byte
	// unchanged.
	if (groups.length === 0) return { ...parseClause([]), orClauses: null };
	const clauses = groups.map(parseClause);
	// A single group is the common (no-OR) case: flat fields ARE the clause and
	// orClauses stays null so nothing downstream has to know about OR.
	if (clauses.length === 1) return { ...clauses[0], orClauses: null };
	// Real OR: the flat fields mirror clause 0 (naive consumers see the first
	// alternative), and orClauses holds every clause INCLUDING clause 0 for
	// OR-aware engines to iterate.
	return { ...clauses[0], orClauses: clauses };
}

/**
 * Classify one group of tokens into the flat clause shape (the pre-OR `out`
 * object). Every OR alternative is one clause; a no-OR query is a single clause.
 */
function parseClause(tokens) {
	const out = {
		textTokens: [],
		// Same plain words as textTokens but in their ORIGINAL case, so a consumer that
		// turns the query back into user-facing text (the "Create <name>" row) doesn't
		// force-lowercase the note's filename. Filter fragments (#tag, ext:, …) are
		// still excluded, exactly like textTokens.
		textTokensRaw: [],
		phrases: [],
		exclusions: [],
		folderIncludes: [],
		pathTerms: [],
		nameTerms: [],
		tags: [],
		properties: [],
		extFilters: [],
		isStarred: false,
		isBookmarked: false,
		modifiedDays: null,
		createdDays: null,
	};
	for (const token of tokens) {
		const value = token.value.trim();
		if (!value) continue;
		if (token.quoted) {
			out.phrases.push(value.toLowerCase());
			continue;
		}
		const lower = value.toLowerCase();
		if (lower.startsWith("-") && lower.length > 1) out.exclusions.push(lower.slice(1));
		else if (lower.startsWith("in:") && lower.length > 3) out.folderIncludes.push(lower.slice(3));
		else if (lower.startsWith("path:") && lower.length > 5) out.pathTerms.push(lower.slice(5));
		else if (lower.startsWith("name:") && lower.length > 5) out.nameTerms.push(lower.slice(5));
		else if (lower.startsWith("tag:") && lower.length > 4) out.tags.push(lower.slice(4).replace(/^#/, ""));
		else if (lower.startsWith("#") && lower.length > 1) out.tags.push(lower.slice(1));
		else if (lower.startsWith("prop:") && lower.length > 5) addProperty(out, lower.slice(5));
		else if (lower.startsWith("@") && lower.length > 1) addProperty(out, lower.slice(1));
		else if (lower.startsWith("ext:") && lower.length > 4) out.extFilters.push(lower.slice(4).replace(/^\./, ""));
		else if (lower.startsWith("modified:") && lower.length > 9) out.modifiedDays = parseDays(lower.slice(9));
		else if (lower.startsWith("created:") && lower.length > 8) out.createdDays = parseDays(lower.slice(8));
		else if (lower === "is:starred") out.isStarred = true;
		else if (lower === "is:bookmarked") out.isBookmarked = true;
		else if (lower !== "#" && lower !== "@" && lower !== "ext:") {
			out.textTokens.push(lower);
			out.textTokensRaw.push(value);
		}
	}
	return out;
}

/**
 * Split a raw CONTENT-search query into disjunctive-normal-form groups for the
 * content engines (ContentSearcher fallback, worker, ripgrep, canvas, base).
 *
 * Content search never went through parseAdvancedQuery — it plain whitespace-
 * splits the body — so OR gets its own dedicated splitter here to keep one owner
 * of the rule. A line matches if it satisfies ANY group (`groups.some`), and
 * every token within a group is required (`group.every`) — i.e. AND within a
 * group, OR across groups. Only an uppercase standalone `OR` separates (compared
 * before lowercasing); everything else is a lowercased search token. `tokens` is
 * the de-duplicated union of every group, used for snippet highlighting so a hit
 * matched via one alternative still highlights that alternative's terms.
 */
export function parseContentQuery(query) {
	const parts = String(query || "")
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	const groups = [];
	let group = [];
	for (const part of parts) {
		if (part === "OR") {
			if (group.length) groups.push(group);
			group = [];
			continue;
		}
		group.push(part.toLowerCase());
	}
	if (group.length) groups.push(group);
	const tokens = Array.from(new Set(groups.flat()));
	return { groups, tokens };
}

function addProperty(out, raw) {
	const eq = raw.indexOf("=");
	const colon = raw.indexOf(":");
	const sep = eq === -1 ? colon : colon === -1 ? eq : Math.min(eq, colon);
	if (sep === -1) out.properties.push({ key: raw, value: null });
	else {
		const key = raw.slice(0, sep);
		if (key) out.properties.push({ key, value: raw.slice(sep + 1) || null });
	}
}

function parseDays(raw) {
	const n = Number(String(raw).replace(/d$/, ""));
	if (!Number.isFinite(n) || n < 0) return null;
	// "modified:0" reads as "today"; a literal 0-day window would exclude
	// everything, so clamp to the last 24 hours.
	return Math.max(1, n);
}

function tokenizeAdvanced(raw) {
	const tokens = [];
	const input = String(raw || "").trim();
	let current = "";
	let quoted = false;
	let inlineQuote = false; // e.g. in:"My Folder" — quote glued to a filter token
	for (let i = 0; i < input.length; i++) {
		const ch = input[i];
		if (ch === '"') {
			if (inlineQuote) {
				inlineQuote = false;
			} else if (quoted) {
				tokens.push({ value: current, quoted: true });
				current = "";
				quoted = false;
			} else if (current.length > 0) {
				// Opening quote in the middle of a token: keep accumulating so
				// filters like in:"Client Projects" survive their inner spaces.
				inlineQuote = true;
			} else {
				quoted = true;
			}
			continue;
		}
		if (!quoted && !inlineQuote && /\s/.test(ch)) {
			if (current.trim()) tokens.push({ value: current.trim(), quoted: false });
			current = "";
			continue;
		}
		current += ch;
	}
	if (current.trim()) tokens.push({ value: current.trim(), quoted });
	return tokens;
}
