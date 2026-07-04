import { App, TFile } from "obsidian";
import { fuzzyMatch } from "./fuzzy";

export type SymbolType = "heading" | "link" | "embed" | "tag" | "block";

export interface SymbolResult {
	file: TFile;
	line: number;
	text: string;
	symbolType: SymbolType;
	/** Heading level (1-6) for headings, 0 otherwise — drives outline indentation. */
	level: number;
	score: number;
	matchIndices: number[];
}

const SYMBOL_ICONS: Record<SymbolType, string> = {
	heading: "heading",
	link: "link",
	embed: "paperclip",
	tag: "tag",
	block: "box",
};

export function iconForSymbolType(type: SymbolType): string {
	return SYMBOL_ICONS[type];
}

/**
 * Lists the navigable symbols of a single file from the metadata cache:
 * headings, links, embeds, tags, and block ids. Empty query returns the
 * full outline in document order; a query fuzzy-filters by symbol text.
 */
export class SymbolSearcher {
	constructor(private app: App) {}

	search(file: TFile, query: string, limit = 100, ignoreDiacritics = false): SymbolResult[] {
		if (file.extension !== "md") return [];
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache) return [];

		const raw: Array<{ text: string; symbolType: SymbolType; line: number; level: number }> = [];

		for (const h of cache.headings ?? []) {
			raw.push({ text: h.heading, symbolType: "heading", line: h.position.start.line + 1, level: h.level });
		}
		for (const l of cache.links ?? []) {
			raw.push({
				text: l.displayText && l.displayText !== l.link ? `${l.link} (${l.displayText})` : l.link,
				symbolType: "link",
				line: l.position.start.line + 1,
				level: 0,
			});
		}
		for (const e of cache.embeds ?? []) {
			raw.push({ text: e.link, symbolType: "embed", line: e.position.start.line + 1, level: 0 });
		}
		for (const t of cache.tags ?? []) {
			raw.push({ text: t.tag, symbolType: "tag", line: t.position.start.line + 1, level: 0 });
		}
		for (const [id, block] of Object.entries(cache.blocks ?? {})) {
			raw.push({ text: `^${id}`, symbolType: "block", line: block.position.start.line + 1, level: 0 });
		}

		const q = query.trim();
		const results: SymbolResult[] = [];
		for (const symbol of raw) {
			let score = 1;
			let matchIndices: number[] = [];
			if (q.length > 0) {
				const match = fuzzyMatch(q, symbol.text, { ignoreDiacritics });
				if (!match) continue;
				score = match.score;
				matchIndices = match.indices;
			}
			results.push({ file, ...symbol, score, matchIndices });
		}

		// Document order when browsing the outline; relevance when filtering.
		if (q.length === 0) results.sort((a, b) => a.line - b.line);
		else results.sort((a, b) => b.score - a.score || a.line - b.line);
		return results.slice(0, limit);
	}
}
