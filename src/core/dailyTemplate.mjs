/**
 * Expand a daily-note template the way core Daily Notes does: substitute the
 * {{date}}, {{time}}, and {{title}} tokens (each with an optional :format
 * suffix, e.g. {{date:YYYY-MM-DD}}). The caller supplies a `resolve(kind, fmt)`
 * function so this stays pure — the moment/date formatting and the note title
 * live with the plugin, but the token parsing is testable in isolation.
 *
 * Unknown tokens are left untouched, and a resolver that returns a non-string
 * leaves that token as-is (so a missing value never injects "undefined").
 */
const TOKEN = /\{\{\s*(date|time|title)\s*(?::([^}]*))?\s*\}\}/gi;

export function fillDailyTemplate(template, resolve) {
	if (typeof template !== "string" || template.length === 0) return "";
	if (typeof resolve !== "function") return template;
	return template.replace(TOKEN, (match, kind, fmt) => {
		const value = resolve(String(kind).toLowerCase(), typeof fmt === "string" ? fmt.trim() : "");
		return typeof value === "string" ? value : match;
	});
}
