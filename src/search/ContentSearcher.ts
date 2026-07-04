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
	/**
	 * Char offsets within `snippet` covering the matched query terms, filled in
	 * centrally by ContentSearcher.search (the engines don't compute it). Optional
	 * so the per-engine result builders don't each have to.
	 */
	matchIndices?: number[];
}

/**
 * Char positions in `snippet` (case-insensitive) covered by any query token, so
 * the list can highlight the hit the same way the filename and preview modes do.
 */
export function snippetMatchIndices(snippet: string, tokens: string[]): number[] {
	if (tokens.length === 0) return [];
	const low = snippet.toLowerCase();
	const marked = new Set<number>();
	for (const token of tokens) {
		if (!token) continue;
		let from = 0;
		for (;;) {
			const at = low.indexOf(token, from);
			if (at === -1) break;
			for (let k = at; k < at + token.length; k++) marked.add(k);
			from = at + token.length;
		}
	}
	return Array.from(marked).sort((a, b) => a - b);
}

/**
 * Deterministic ordering shared by every content-engine sort: score desc, then
 * path, then line. Scores are coarse buckets (many rows tie), so without a stable
 * tiebreak the final top-N would depend on iteration order — which differs between
 * the worker (Map insertion order) and the in-process fallback (live getMarkdownFiles
 * order). That would make results depend on Worker availability, which the worker
 * contract forbids. Plain `<`/`>` (not localeCompare) so it's locale-independent and
 * matches the identical comparator inlined in workerSource.mjs.
 */
function compareContentRows(a: ContentSearchResult, b: ContentSearchResult): number {
	return (
		b.score - a.score ||
		(a.file.path < b.file.path ? -1 : a.file.path > b.file.path ? 1 : 0) ||
		a.line - b.line
	);
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
	// Bumped by invalidate(); a build that started under an older epoch must not
	// mark the index complete (a mid-build clear wiped its early files). Mirrors
	// the guard in WorkerIndex so both index paths survive a concurrent reset.
	private indexEpoch = 0;
	private ripgrep: RipgrepSearcher;
	private canvas: CanvasSearcher;
	private bases: BaseSearcher;
	// undefined = not tried yet; null = unavailable or died → in-process fallback.
	private workerIndex: WorkerIndex | null | undefined = undefined;
	private disposed = false;

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
		// Kill any process the old searcher still has running before dropping it.
		this.ripgrep.dispose();
		this.ripgrep = new RipgrepSearcher(this.app, command);
	}

	async search(query: string, options: ContentSearchOptions): Promise<ContentSearchResult[]> {
		if (!query.trim()) return [];
		const limit = options.limit ?? 40;
		const excluded = normalizeExcludeFolders(options.excludeFolders);
		const tokens = query.trim().split(/\s+/).filter(Boolean).map((t) => t.toLowerCase());
		if (tokens.length === 0) return [];

		// Canvas and Bases hold structure ripgrep can't parse line-by-line — a
		// canvas note is a single line of JSON, a base is a YAML view/filter
		// block. They always go through their node/YAML-aware searchers and merge
		// into whichever text engine ran for markdown, rather than through rg
		// globs that would mangle (or drop) the matches.
		const extraLimit = Math.max(10, Math.floor(limit / 2));
		const extras: ContentSearchResult[] = [];
		if (options.includeCanvas) {
			extras.push(...(await this.canvas.search(tokens, extraLimit, excluded)));
		}
		if (options.includeBases) {
			extras.push(...(await this.bases.search(tokens, extraLimit, excluded)));
		}

		// A non-null ripgrep result means rg ran — trust it even when empty, so a
		// legitimate no-match query doesn't trigger a full-vault index build.
		let base: ContentSearchResult[] | null = null;
		if (options.useRipgrep) {
			base = await this.ripgrep.search(query, {
				excludeFolders: options.excludeFolders,
				limit,
			});
		}
		if (base === null) base = await this.searchVaultIndex(tokens, limit, excluded);

		const results = extras.length === 0 ? base : this.mergeResults(base, extras, limit);
		// Annotate in one place so every engine's rows highlight identically.
		for (const result of results) {
			result.matchIndices = snippetMatchIndices(result.snippet, tokens);
		}
		return results;
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
				// Plugin unload rejects pending searches too — that's shutdown,
				// not a worker failure; don't kick off a full-vault index build
				// for a result nobody will see.
				if (this.disposed) return [];
				console.warn("[VaultSpotlight] content index worker failed, falling back in-process", err);
				this.retireWorker();
			}
		}

		await this.ensureIndex();
		const results: ContentSearchResult[] = [];
		// Bound memory without dropping the true top matches: a one-character
		// query ("e") matches nearly every line in the vault. Whenever the
		// working set grows past a soft cap, sort and keep only the current
		// top `limit`. Everything discarded scored below all kept rows, so it can
		// never belong in the final top-`limit` — the result is identical to
		// collecting everything and slicing, but memory stays O(limit).
		const softCap = Math.max(limit * 10, 500);

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
				if (results.length >= softCap) {
					results.sort(compareContentRows);
					results.length = limit;
				}
			}
		}

		return results.sort(compareContentRows).slice(0, limit);
	}

	private mergeResults(
		a: ContentSearchResult[],
		b: ContentSearchResult[],
		limit: number
	): ContentSearchResult[] {
		const seen = new Set<string>();
		const merged: ContentSearchResult[] = [];

		for (const result of [...a, ...b].sort(compareContentRows)) {
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
		// Bump the epoch so any in-flight build becomes a no-op (it can't flip
		// indexBuilt for a cleared index), then drop the promise so the next
		// search starts a *fresh, complete* build rather than awaiting the stale
		// one and scanning a half-emptied index.
		this.indexEpoch++;
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

	/** Release the worker and any in-flight ripgrep process when the plugin unloads. */
	dispose(): void {
		this.disposed = true;
		this.ripgrep.dispose();
		this.workerIndex?.dispose();
		this.workerIndex = null;
	}

	private ensureIndex(): Promise<void> {
		// The in-flight check MUST come before the built check: during a build
		// the index is partially populated, so any "is it ready?" signal based
		// on contents would hand a second keystroke a half-built index.
		if (this.buildPromise) return this.buildPromise;
		if (this.indexBuilt) return Promise.resolve();
		const epoch = this.indexEpoch;
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
			// invalidate() during the build wiped some of what was just read;
			// leave indexBuilt false so the next caller triggers a fresh build.
			if (epoch === this.indexEpoch) this.indexBuilt = true;
		})().finally(() => {
			this.buildPromise = null;
		});
		return this.buildPromise;
	}
}