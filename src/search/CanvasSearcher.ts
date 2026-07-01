import { App } from "obsidian";
import type { ContentSearchResult } from "./ContentSearcher";
import { isPathExcluded } from "./vaultFiles";

interface CanvasNode {
	type?: string;
	text?: unknown;
	label?: unknown;
}

export class CanvasSearcher {
	constructor(private app: App) {}

	async search(tokens: string[], limit = 20, excluded: string[] = []): Promise<ContentSearchResult[]> {
		const needAll = tokens.map((t) => t.toLowerCase()).filter(Boolean);
		if (needAll.length === 0) return [];
		const results: ContentSearchResult[] = [];

		for (const file of this.app.vault.getFiles()) {
			if (file.extension !== "canvas") continue;
			if (isPathExcluded(file.path, excluded)) continue;

			let raw: string;
			try {
				raw = await this.app.vault.cachedRead(file);
			} catch {
				continue;
			}

			const snippets = this.extractSearchableLines(raw);
			for (const { line, text } of snippets) {
				const low = text.toLowerCase();
				if (!needAll.every((tk) => low.includes(tk))) continue;
				results.push({
					file,
					line,
					snippet: text.slice(0, 160),
					score: 90 - line,
					engine: "canvas",
				});
			}
		}

		return results.sort((a, b) => b.score - a.score).slice(0, limit);
	}

	private extractSearchableLines(raw: string): Array<{ line: number; text: string }> {
		const lines: Array<{ line: number; text: string }> = [];
		try {
			const data = JSON.parse(raw) as { nodes?: unknown };
			const nodes = Array.isArray(data.nodes) ? (data.nodes as CanvasNode[]) : [];
			nodes.forEach((node, index) => {
				const text = String(node?.text ?? node?.label ?? "").trim();
				if (text) {
					lines.push({ line: index + 1, text });
				}
			});
		} catch {
			raw.split("\n").forEach((text, index) => {
				const trimmed = text.trim();
				if (trimmed) lines.push({ line: index + 1, text: trimmed });
			});
		}
		return lines;
	}
}