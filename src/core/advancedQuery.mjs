export function parseAdvancedQuery(raw) {
	const tokens = tokenizeAdvanced(raw);
	const out = {
		textTokens: [],
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
		else if (lower !== "#" && lower !== "@" && lower !== "ext:") out.textTokens.push(lower);
	}
	return out;
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
	return Number.isFinite(n) && n >= 0 ? n : null;
}

function tokenizeAdvanced(raw) {
	const tokens = [];
	const input = String(raw || "").trim();
	let current = "";
	let quoted = false;
	for (let i = 0; i < input.length; i++) {
		const ch = input[i];
		if (ch === '"') {
			if (quoted) {
				tokens.push({ value: current, quoted: true });
				current = "";
				quoted = false;
			} else {
				if (current.trim()) tokens.push({ value: current.trim(), quoted: false });
				current = "";
				quoted = true;
			}
			continue;
		}
		if (!quoted && /\s/.test(ch)) {
			if (current.trim()) tokens.push({ value: current.trim(), quoted: false });
			current = "";
			continue;
		}
		current += ch;
	}
	if (current.trim()) tokens.push({ value: current.trim(), quoted });
	return tokens;
}
