import { App, TFile } from "obsidian";
import { compareContentRows, type ContentSearchResult } from "./ContentSearcher";
import { isPathExcluded } from "./vaultFiles";

/**
 * Content search inside Obsidian Bases (.base) files. Base definitions are
 * YAML (views, filters, formulas, property names) — a line-based text match
 * is enough to find "which base view queries status=active".
 */
export class BaseSearcher {
	// Split lines per base file, keyed by path and invalidated by mtime — the same
	// per-keystroke re-parse avoidance the canvas searcher uses. cachedRead elides
	// the disk read; this elides the split on every debounced keystroke.
	private cache = new Map<string, { mtime: number; lines: string[] }>();

	constructor(private app: App) {}

	async search(tokens: string[], limit = 20, excluded: string[] = []): Promise<ContentSearchResult[]> {
		const needAll = tokens.map((t) => t.toLowerCase()).filter(Boolean);
		if (needAll.length === 0) return [];
		const results: ContentSearchResult[] = [];
		// Prune to top-`limit` past a soft cap so a huge base file can't grow an
		// unbounded array, without dropping any genuinely top-scored line.
		const softCap = Math.max(limit * 10, 500);
		const present = new Set<string>();

		for (const file of this.app.vault.getFiles()) {
			if (file.extension !== "base") continue;
			present.add(file.path);
			if (isPathExcluded(file.path, excluded)) continue;

			const lines = await this.getLines(file);
			for (let i = 0; i < lines.length; i++) {
				const text = lines[i].trim();
				if (!text) continue;
				const low = text.toLowerCase();
				// AND semantics: the line must contain every token.
				if (!needAll.every((tk) => low.includes(tk))) continue;
				results.push({
					file,
					line: i + 1,
					snippet: text.slice(0, 160),
					// Slightly below markdown and canvas matches, floored so it
					// never goes negative.
					score: Math.max(1, 85 - Math.floor(i / 10)),
					engine: "base",
				});
				if (results.length >= softCap) {
					// Deterministic (score, path, line) sort — same comparator the
					// markdown engines use — so tied rows aren't pruned by iteration order.
					results.sort(compareContentRows);
					results.length = limit;
				}
			}
		}

		// Drop cache entries for base files that no longer exist.
		if (this.cache.size > present.size) {
			for (const path of this.cache.keys()) if (!present.has(path)) this.cache.delete(path);
		}

		return results.sort(compareContentRows).slice(0, limit);
	}

	/** Split lines for one base file, served from cache unless its mtime moved. */
	private async getLines(file: TFile): Promise<string[]> {
		const cached = this.cache.get(file.path);
		if (cached && cached.mtime === file.stat.mtime) return cached.lines;
		let raw: string;
		try {
			raw = await this.app.vault.cachedRead(file);
		} catch {
			return [];
		}
		const lines = raw.split("\n");
		this.cache.set(file.path, { mtime: file.stat.mtime, lines });
		return lines;
	}
}
