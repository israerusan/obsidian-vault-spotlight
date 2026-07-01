import { App, TFile } from "obsidian";
import { RipgrepSearcher } from "./RipgrepSearcher";
import { CanvasSearcher } from "./CanvasSearcher";
import { isPathExcluded, normalizeExcludeFolders } from "./vaultFiles";

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
	excludeFolders?: string[];
	limit?: number;
}

export class ContentSearcher {
	private index = new Map<string, string[]>();
	private buildPromise: Promise<void> | null = null;
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
		const excluded = normalizeExcludeFolders(options.excludeFolders);
		const tokens = query.trim().split(/\s+/).filter(Boolean).map((t) => t.toLowerCase());

		if (options.useRipgrep) {
			const rgResults = await this.ripgrep.search(query, {
				includeCanvas: options.includeCanvas,
				excludeFolders: options.excludeFolders,
				limit,
			});
			// A non-null result means ripgrep ran — trust it even when empty, so a
			// legitimate no-match query doesn't trigger a full-vault index build.
			if (rgResults !== null) return rgResults;
		}

		const vaultResults = await this.searchVaultIndex(tokens, limit, excluded);
		if (!options.includeCanvas) return vaultResults;

		const canvasResults = await this.canvas.search(tokens, Math.max(10, Math.floor(limit / 2)), excluded);
		return this.mergeResults(vaultResults, canvasResults, limit);
	}

	private async searchVaultIndex(
		tokens: string[],
		limit: number,
		excluded: string[]
	): Promise<ContentSearchResult[]> {
		await this.ensureIndex();
		const results: ContentSearchResult[] = [];

		for (const file of this.app.vault.getMarkdownFiles()) {
			if (isPathExcluded(file.path, excluded)) continue;
			const lines = this.index.get(file.path);
			if (!lines) continue;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const low = line.toLowerCase();
				// AND semantics: the line must contain every token.
				if (!tokens.every((tk) => low.includes(tk))) continue;
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

	/** Full reset — use when the ripgrep command or global config changes. */
	invalidate(): void {
		this.index.clear();
		this.buildPromise = null;
	}

	/** Incremental: re-read a single changed/created file into the index. */
	async updateFile(file: TFile): Promise<void> {
		if (file.extension !== "md") return;
		// Only maintain incrementally once the index is populated; otherwise the
		// next full build will read it anyway.
		if (this.index.size === 0) return;
		try {
			const content = await this.app.vault.cachedRead(file);
			this.index.set(file.path, content.split("\n"));
		} catch {
			this.index.delete(file.path);
		}
	}

	/** Incremental: drop a deleted file from the index. */
	removeFile(path: string): void {
		this.index.delete(path);
	}

	private ensureIndex(): Promise<void> {
		if (this.index.size > 0) return Promise.resolve();
		// Coalesce concurrent callers onto a single in-flight build so a second
		// keystroke never races against a half-built (empty) index.
		if (this.buildPromise) return this.buildPromise;
		this.buildPromise = (async () => {
			for (const file of this.app.vault.getMarkdownFiles()) {
				try {
					const content = await this.app.vault.cachedRead(file);
					this.index.set(file.path, content.split("\n"));
				} catch {
					// Skip a file that vanished or is unreadable mid-build rather
					// than aborting the whole index.
				}
			}
		})();
		try {
			return this.buildPromise;
		} finally {
			void this.buildPromise.finally(() => {
				this.buildPromise = null;
			});
		}
	}
}