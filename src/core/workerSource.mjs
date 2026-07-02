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
self.onmessage = (evt) => {
	const msg = evt.data || {};
	if (msg.type === "set") {
		index.set(msg.path, msg.content.split("\\n"));
	} else if (msg.type === "remove") {
		index.delete(msg.path);
	} else if (msg.type === "clear") {
		index.clear();
	} else if (msg.type === "search") {
		const tokens = msg.tokens || [];
		const excluded = msg.excluded || [];
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
				let ok = true;
				for (const tk of tokens) {
					if (!low.includes(tk)) { ok = false; break; }
				}
				if (!ok) continue;
				results.push({
					path,
					line: i + 1,
					snippet: lines[i].trim().slice(0, 160),
					score: Math.max(1, 100 - Math.floor(i / 10)),
				});
			}
		}
		results.sort((a, b) => b.score - a.score);
		self.postMessage({ type: "results", id: msg.id, results: results.slice(0, msg.limit || 40) });
	}
};
`;
