import { App, TFile } from "obsidian";
import type { ContentSearchResult } from "./ContentSearcher";

interface CanvasNode {
	type?: string;
	text?: string;
	label?: string;
}

export class CanvasSearcher {
	constructor(private app: App) {}

	async search(query: string, limit = 20): Promise<ContentSearchResult[]> {
		if (!query.trim()) return [];
		const q = query.toLowerCase();
		const results: ContentSearchResult[] = [];

		for (const file of this.app.vault.getFiles()) {
			if (file.extension !== "canvas") continue;

			let raw: string;
			try {
				raw = await this.app.vault.cachedRead(file);
			} catch {
				continue;
			}

			const snippets = this.extractSearchableLines(raw);
			for (const { line, text } of snippets) {
				if (!text.toLowerCase().includes(q)) continue;
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
			const data = JSON.parse(raw) as { nodes?: CanvasNode[] };
			const nodes = data.nodes ?? [];
			nodes.forEach((node, index) => {
				const text = (node.text ?? node.label ?? "").trim();
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