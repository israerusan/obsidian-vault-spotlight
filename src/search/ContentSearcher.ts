import { App, TFile } from "obsidian";
import { RipgrepSearcher } from "./RipgrepSearcher";
import { CanvasSearcher } from "./CanvasSearcher";
import { BaseSearcher } from "./BaseSearcher";
import { WorkerIndex } from "./WorkerIndex";
import { isPathExcluded, normalizeExcludeFolders } from "./vaultFiles";

export interface ContentSearchResult {
	file: TFile;
	line: number;
	snippet: string;
	score: number;
	engine: "ripgrep" | "vault" | "canvas" | "base";
}

export interface ContentSearchOptions {
	useRipgrep: boolean;
	includeCanvas: boolean;
	includeBases?: boolean;
	excludeFolders?: string[];
	limit?: number;
}

export class ContentSearcher {
	private index = new Map<string, string[]>();
	private indexBuilt = false;
	private buildPromise: Promise<void> | null = null;
	private ripgrep: RipgrepSearcher;
	private canvas: CanvasSearcher;
	private bases: BaseSearcher;
	// undefined = not tried yet; null = unavailable or died → in-process fallback.
	private workerIndex: WorkerIndex | null | undefined = undefined;

	constructor(private app: App, ripgrepCommand = "rg") {
		this.ripgrep = new RipgrepSearcher(app, ripgrepCommand);
		this.canvas = new CanvasSearcher(app);
		this.bases = new BaseSearcher(app);
	}

	private getWorkerIndex(): WorkerIndex | null {
		if (this.workerIndex === undefined) {
			this.workerIndex = WorkerIndex.create(this.app);
		}
		return this.workerIndex;
	}

	/** Permanently drop a failed worker and use the in-process index instead. */
	private retireWorker(): void {
		this.workerIndex?.dispose();
		this.workerIndex = null;
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
				includeBases: options.includeBases ?? false,
				excludeFolders: options.excludeFolders,
				limit,
			});
			// A non-null result means ripgrep ran — trust it even when empty, so a
			// legitimate no-match query doesn't trigger a full-vault index build.
			if (rgResults !== null) return rgResults;
		}

		const vaultResults = await this.searchVaultIndex(tokens, limit, excluded);
		const extraLimit = Math.max(10, Math.floor(limit / 2));
		const extras: ContentSearchResult[] = [];
		if (options.includeCanvas) {
			extras.push(...(await this.canvas.search(tokens, extraLimit, excluded)));
		}
		if (options.includeBases) {
			extras.push(...(await this.bases.search(tokens, extraLimit, excluded)));
		}
		if (extras.length === 0) return vaultResults;
		return this.mergeResults(vaultResults, extras, limit);
	}

	private async searchVaultIndex(
		tokens: string[],
		limit: number,
		excluded: string[]
	): Promise<ContentSearchResult[]> {
		// Preferred path: the index lives in a web worker, so the per-keystroke
		// scan (and the retained vault text) stays off the main thread.
		const worker = this.getWorkerIndex();
		if (worker) {
			try {
				const rows = await worker.search(tokens, limit, excluded);
				const results: ContentSearchResult[] = [];
				for (const row of rows) {
					const file = this.app.vault.getAbstractFileByPath(row.path);
					if (!(file instanceof TFile)) continue;
					results.push({
						file,
						line: row.line,
						snippet: row.snippet,
						score: row.score,
						engine: "vault",
					});
				}
				return results;
			} catch (err) {
				console.warn("[VaultSpotlight] content index worker failed, falling back in-process", err);
				this.retireWorker();
			}
		}

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
					// Gentle early-line preference with a floor — a match on line
					// 5000 must still rank, never go negative.
					score: Math.max(1, 100 - Math.floor(i / 10)),
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
		this.workerIndex?.invalidate();
		this.index.clear();
		this.indexBuilt = false;
		this.buildPromise = null;
	}

	/** Incremental: re-read a single changed/created file into the index. */
	async updateFile(file: TFile): Promise<void> {
		if (file.extension !== "md") return;
		if (this.workerIndex) {
			await this.workerIndex.updateFile(file);
		}
		// If a build is in flight, wait for it so this update lands on the final
		// index instead of racing the builder over the same path.
		if (this.buildPromise) await this.buildPromise;
		// Only maintain incrementally once the index is populated; otherwise the
		// next full build will read it anyway.
		if (!this.indexBuilt) return;
		try {
			const content = await this.app.vault.cachedRead(file);
			this.index.set(file.path, content.split("\n"));
		} catch {
			this.index.delete(file.path);
		}
	}

	/** Incremental: drop a deleted file from the index. */
	removeFile(path: string): void {
		this.workerIndex?.removeFile(path);
		this.index.delete(path);
	}

	/** Release the worker when the plugin unloads. */
	dispose(): void {
		this.workerIndex?.dispose();
		this.workerIndex = null;
	}

	private ensureIndex(): Promise<void> {
		// The in-flight check MUST come before the built check: during a build
		// the index is partially populated, so any "is it ready?" signal based
		// on contents would hand a second keystroke a half-built index.
		if (this.buildPromise) return this.buildPromise;
		if (this.indexBuilt) return Promise.resolve();
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
			this.indexBuilt = true;
		})().finally(() => {
			this.buildPromise = null;
		});
		return this.buildPromise;
	}
}