/**
 * Expand a leading search alias. Aliases are `name = expansion` lines; if the
 * query's first whitespace-delimited token matches an alias name (case-insensitive),
 * replace just that token with the alias's expansion and keep the rest of the
 * query. Pure — the modal passes the Pro flag and the raw aliases text. Aliases
 * are a Pro feature, so a free tier (or empty aliases) is a passthrough.
 *
 * @param {string} raw
 * @param {{isPro?: boolean, aliases?: string}} [options]
 * @returns {string}
 */
export function expandSearchAlias(raw, options = {}) {
	const text = String(raw ?? "");
	const aliases = typeof options.aliases === "string" ? options.aliases : "";
	if (options.isPro !== true || !aliases.trim()) return text;
	const parts = text.trim().split(/\s+/);
	if (parts.length === 0 || parts[0] === "") return text;
	const first = parts[0].toLowerCase();
	for (const line of aliases.split("\n")) {
		const match = line.match(/^\s*([^=]+?)\s*=\s*(.+)$/);
		if (!match) continue;
		if (match[1].trim().toLowerCase() === first) return [match[2].trim(), ...parts.slice(1)].join(" ");
	}
	return text;
}
