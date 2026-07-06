/**
 * Source for the content-index web worker: holds every markdown file's lines
 * and runs the per-keystroke AND-token scan off the main thread. Kept as a
 * self-contained source string because Obsidian plugins ship a single
 * main.js — the worker is spawned from a Blob URL (see WorkerIndex.ts).
 *
 * Scoring and snippet rules MUST stay identical to ContentSearcher's
 * in-process fallback, or results would change depending on Worker support.
 *
 * Lives in core so Node tests can exercise the exact code the worker runs.
 */
export const WORKER_SOURCE = `
const index = new Map();
// Deterministic ordering: score desc, then path, then line. MUST stay identical
// to compareContentRows in ContentSearcher.ts so the worker and in-process paths
// return the same top-N for a tied query regardless of Worker availability.
const cmp = (a, b) =>
	(b.score - a.score) ||
	(a.path < b.path ? -1 : a.path > b.path ? 1 : 0) ||
	(a.line - b.line);
self.onmessage = (evt) => {
	const msg = evt.data || {};
	if (msg.type === "set") {
		// Coerce defensively: a malformed message with non-string content would
		// otherwise throw here, fire onerror, and retire the worker for the whole
		// session.
		// Cap each line at 2000 chars — MUST match MAX_INDEXED_LINE_LEN in
		// ContentSearcher.ts so the worker and in-process indexes hold identical
		// text (a pathological multi-MB line would otherwise bloat the worker and
		// diverge the two paths' matches).
		index.set(
			msg.path,
			String(msg.content == null ? "" : msg.content)
				.split("\\n")
				.map(function (l) { return l.length > 2000 ? l.slice(0, 2000) : l; })
		);
	} else if (msg.type === "remove") {
		index.delete(msg.path);
	} else if (msg.type === "clear") {
		index.clear();
	} else if (msg.type === "search") {
		// DNF groups: AND within a group, OR across groups. Accept a legacy
		// tokens-only message (a single AND group) so older callers/tests still
		// work. MUST stay identical to ContentSearcher.searchVaultIndex's DNF test.
		const groups = msg.groups || (msg.tokens && msg.tokens.length ? [msg.tokens] : []);
		const excluded = msg.excluded || [];
		const limit = msg.limit || 40;
		// Bound memory without dropping the true top matches: a one-character
		// query matches nearly every line. Whenever the working set grows past a
		// soft cap, sort and keep only the current top \`limit\`; discarded rows
		// scored below every kept row so they can't belong in the final top-N.
		// This keeps the worker's result set identical to the in-process fallback.
		const softCap = Math.max(limit * 10, 500);
		const results = [];
		for (const entry of index) {
			const path = entry[0];
			const lines = entry[1];
			const p = path.toLowerCase();
			let skip = false;
			for (const f of excluded) {
				if (p === f || p.startsWith(f + "/")) { skip = true; break; }
			}
			if (skip) continue;
			for (let i = 0; i < lines.length; i++) {
				const low = lines[i].toLowerCase();
				// Keep the line if it satisfies ANY group (OR across groups) with
				// every token in that group present (AND within a group). An empty
				// group is skipped so it can't vacuously match everything.
				let ok = false;
				for (const g of groups) {
					if (!g.length) continue;
					let all = true;
					for (const tk of g) {
						if (!low.includes(tk)) { all = false; break; }
					}
					if (all) { ok = true; break; }
				}
				if (!ok) continue;
				results.push({
					path,
					line: i + 1,
					snippet: lines[i].trim().slice(0, 160),
					score: Math.max(1, 100 - Math.floor(i / 10)),
				});
				if (results.length >= softCap) {
					results.sort(cmp);
					results.length = limit;
				}
			}
		}
		results.sort(cmp);
		self.postMessage({ type: "results", id: msg.id, results: results.slice(0, limit) });
	}
};
`;
