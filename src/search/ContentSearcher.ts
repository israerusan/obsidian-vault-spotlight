import { App, TFile } from "obsidian";

export interface ContentSearchResult {
	file: TFile;
	line: number;
	snippet: string;
	score: number;
}

export class ContentSearcher {
	private index = new Map<string, string[]>();
	private building = false;

	constructor(private app: App) {}

	async search(query: string, limit = 40): Promise<ContentSearchResult[]> {
		if (!query.trim()) return [];
		await this.ensureIndex();
		const q = query.toLowerCase();
		const results: ContentSearchResult[] = [];

		for (const file of this.app.vault.getMarkdownFiles()) {
			const lines = this.index.get(file.path);
			if (!lines) continue;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const idx = line.toLowerCase().indexOf(q);
				if (idx === -1) continue;
				const snippet = line.trim().slice(0, 160);
				results.push({
					file,
					line: i + 1,
					snippet,
					score: 100 - i + (idx === 0 ? 10 : 0),
				});
			}
		}

		return results.sort((a, b) => b.score - a.score).slice(0, limit);
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