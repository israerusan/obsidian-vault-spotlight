import { App, TFile } from "obsidian";
import { RipgrepSearcher } from "./RipgrepSearcher";
import { CanvasSearcher } from "./CanvasSearcher";

export interface ContentSearchResult {
	file: TFile;
	line: number;
	snippet: string;
	score: number;
	engine: "ripgrep" | "vault" | "canvas";
}

export interface ContentSearchOptions {
	useRipgrep: boolean;
	ripgrepCommand: string;
	includeCanvas: boolean;
	limit?: number;
}

export class ContentSearcher {
	private index = new Map<string, string[]>();
	private building = false;
	private ripgrep: RipgrepSearcher;
	private canvas: CanvasSearcher;

	constructor(private app: App, ripgrepCommand = "rg") {
		this.ripgrep = new RipgrepSearcher(app, ripgrepCommand);
		this.canvas = new CanvasSearcher(app);
	}

	setRipgrepCommand(command: string): void {
		this.ripgrep = new RipgrepSearcher(this.app, command);
	}

	async search(query: string, options: ContentSearchOptions): Promise<ContentSearchResult[]> {
		if (!query.trim()) return [];
		const limit = options.limit ?? 40;

		if (options.useRipgrep) {
			const rgResults = await this.ripgrep.search(query, {
				includeCanvas: options.includeCanvas,
				limit,
			});
			if (rgResults.length > 0) return rgResults;
		}

		const vaultResults = await this.searchVaultIndex(query, limit);
		if (!options.includeCanvas) return vaultResults;

		const canvasResults = await this.canvas.search(query, Math.max(10, Math.floor(limit / 2)));
		return this.mergeResults(vaultResults, canvasResults, limit);
	}

	private async searchVaultIndex(query: string, limit: number): Promise<ContentSearchResult[]> {
		await this.ensureIndex();
		const q = query.toLowerCase();
		const results: ContentSearchResult[] = [];

		for (const file of this.app.vault.getMarkdownFiles()) {
			const lines = this.index.get(file.path);
			if (!lines) continue;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (!line.toLowerCase().includes(q)) continue;
				results.push({
					file,
					line: i + 1,
					snippet: line.trim().slice(0, 160),
					score: 100 - i,
					engine: "vault",
				});
			}
		}

		return results.sort((a, b) => b.score - a.score).slice(0, limit);
	}

	private mergeResults(
		a: ContentSearchResult[],
		b: ContentSearchResult[],
		limit: number
	): ContentSearchResult[] {
		const seen = new Set<string>();
		const merged: ContentSearchResult[] = [];

		for (const result of [...a, ...b].sort((x, y) => y.score - x.score)) {
			const key = `${result.file.path}:${result.line}:${result.snippet}`;
			if (seen.has(key)) continue;
			seen.add(key);
			merged.push(result);
			if (merged.length >= limit) break;
		}

		return merged;
	}

	invalidate(): void {
		this.index.clear();
	}

	private async ensureIndex(): Promise<void> {
		if (this.index.size > 0 || this.building) return;
		this.building = true;
		try {
			for (const file of this.app.vault.getMarkdownFiles()) {
				const content = await this.app.vault.cachedRead(file);
				this.index.set(file.path, content.split("\n"));
			}
		} finally {
			this.building = false;
		}
	}
}