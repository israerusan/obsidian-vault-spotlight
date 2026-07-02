import { App } from "obsidian";
import type { ContentSearchResult } from "./ContentSearcher";
import { isPathExcluded } from "./vaultFiles";

/**
 * Content search inside Obsidian Bases (.base) files. Base definitions are
 * YAML (views, filters, formulas, property names) — a line-based text match
 * is enough to find "which base view queries status=active".
 */
export class BaseSearcher {
	constructor(private app: App) {}

	async search(tokens: string[], limit = 20, excluded: string[] = []): Promise<ContentSearchResult[]> {
		const needAll = tokens.map((t) => t.toLowerCase()).filter(Boolean);
		if (needAll.length === 0) return [];
		const results: ContentSearchResult[] = [];

		for (const file of this.app.vault.getFiles()) {
			if (file.extension !== "base") continue;
			if (isPathExcluded(file.path, excluded)) continue;

			let raw: string;
			try {
				raw = await this.app.vault.cachedRead(file);
			} catch {
				continue;
			}

			const lines = raw.split("\n");
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
			}
		}

		return results.sort((a, b) => b.score - a.score).slice(0, limit);
	}
}
