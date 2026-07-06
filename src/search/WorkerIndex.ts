import { App, TFile } from "obsidian";
import { WORKER_SOURCE } from "../core/workerSource.mjs";

export interface WorkerIndexRow {
	path: string;
	line: number;
	snippet: string;
	score: number;
}

/**
 * A worker scan that didn't answer within the deadline. Distinct from a genuine
 * worker failure (onerror/postMessage throw) so the caller can fall back for a
 * single query WITHOUT permanently retiring a worker that's merely slow (a GC/OS
 * pause or one heavy scan on a huge vault) — see ContentSearcher.searchVaultIndex.
 */
export class WorkerTimeoutError extends Error {}

/**
 * Off-main-thread content index. File reads still happen on the main thread
 * (only it can touch the vault); the retained text and the scan live in the
 * worker. Callers must be ready for `search` to reject (worker died) and
 * fall back to an in-process index.
 */
/** A worker scan should answer in well under a second; if nothing comes back
 * in this window the worker is presumed dead (killed without an error event —
 * e.g. OS memory pressure) and the caller falls back to the in-process index.
 *
 * The FIRST search after a (re)build is generous: the worker may still be
 * draining a large queue of posted "set" messages on a big vault. Once one scan
 * has answered we know the worker is live and responsive, so subsequent searches
 * use a much tighter deadline — a silent death then falls back in ~3s instead of
 * freezing content mode on the loading skeleton for a full 15s. */
const COLD_SEARCH_TIMEOUT_MS = 15000;
const WARM_SEARCH_TIMEOUT_MS = 3000;

export class WorkerIndex {
	private built = false;
	private buildPromise: Promise<void> | null = null;
	// Set once a scan has answered since the last (re)build; lets steady-state
	// searches use the tighter WARM timeout. Reset by invalidate() so the first
	// search after a rebuild gets the generous COLD deadline again.
	private warm = false;
	// Bumped by invalidate(); a build that started under an older epoch must
	// not mark the index as complete (a mid-build "clear" wiped its early files).
	private epoch = 0;
	private nextId = 1;
	private pending = new Map<number, { resolve: (rows: WorkerIndexRow[]) => void; reject: (err: Error) => void }>();

	/** Returns null when Workers/Blob URLs aren't available in this environment. */
	static create(app: App): WorkerIndex | null {
		let url: string | null = null;
		try {
			url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
			const worker = new Worker(url);
			return new WorkerIndex(app, worker, url);
		} catch {
			// Don't leak the object URL when the Worker constructor itself throws.
			if (url) URL.revokeObjectURL(url);
			return null;
		}
	}

	private constructor(
		private app: App,
		private worker: Worker,
		private blobUrl: string
	) {
		this.worker.onmessage = (evt: MessageEvent) => {
			const msg = evt.data as { type?: string; id?: number; results?: WorkerIndexRow[] };
			if (msg?.type !== "results" || typeof msg.id !== "number") return;
			const entry = this.pending.get(msg.id);
			if (!entry) return;
			this.pending.delete(msg.id);
			entry.resolve(msg.results ?? []);
		};
		this.worker.onerror = () => this.failPending(new Error("content index worker error"));
		this.worker.onmessageerror = () => this.failPending(new Error("content index worker message error"));
	}

	/**
	 * Stream every markdown file into the worker once, coalescing concurrent
	 * callers. Message ordering guarantees a search posted afterwards sees the
	 * complete index.
	 */
	private ensureBuilt(): Promise<void> {
		if (this.buildPromise) return this.buildPromise;
		if (this.built) return Promise.resolve();
		const epoch = this.epoch;
		this.buildPromise = (async () => {
			for (const file of this.app.vault.getMarkdownFiles()) {
				try {
					const content = await this.app.vault.cachedRead(file);
					this.worker.postMessage({ type: "set", path: file.path, content });
				} catch {
					// Skip a file that vanished or is unreadable mid-build.
				}
			}
			// invalidate() during the build wiped some of what was just posted;
			// leave built=false so the next caller triggers a fresh full build.
			if (epoch === this.epoch) this.built = true;
		})().finally(() => {
			this.buildPromise = null;
		});
		return this.buildPromise;
	}

	async search(groups: string[][], limit: number, excluded: string[]): Promise<WorkerIndexRow[]> {
		await this.ensureBuilt();
		return new Promise<WorkerIndexRow[]>((resolve, reject) => {
			const id = this.nextId++;
			// A worker killed by the OS fires no error event — without a timeout
			// this promise would hang forever and content mode would be stuck on
			// the loading skeleton with the fallback path unreachable.
			const timer = window.setTimeout(() => {
				if (this.pending.delete(id)) reject(new WorkerTimeoutError("content index worker timed out"));
			}, this.warm ? WARM_SEARCH_TIMEOUT_MS : COLD_SEARCH_TIMEOUT_MS);
			this.pending.set(id, {
				resolve: (rows) => {
					window.clearTimeout(timer);
					this.warm = true;
					resolve(rows);
				},
				reject: (err) => {
					window.clearTimeout(timer);
					reject(err);
				},
			});
			try {
				this.worker.postMessage({ type: "search", id, groups, limit, excluded });
			} catch (err) {
				window.clearTimeout(timer);
				this.pending.delete(id);
				reject(err instanceof Error ? err : new Error(String(err)));
			}
		});
	}

	async updateFile(file: TFile): Promise<void> {
		if (file.extension !== "md") return;
		if (this.buildPromise) await this.buildPromise;
		// Before the first build there is nothing to maintain — the build will
		// read this file anyway.
		if (!this.built) return;
		try {
			const content = await this.app.vault.cachedRead(file);
			this.worker.postMessage({ type: "set", path: file.path, content });
		} catch {
			this.worker.postMessage({ type: "remove", path: file.path });
		}
	}

	removeFile(path: string): void {
		if (!this.built && !this.buildPromise) return;
		this.worker.postMessage({ type: "remove", path });
	}

	invalidate(): void {
		this.epoch++;
		this.built = false;
		this.warm = false;
		this.worker.postMessage({ type: "clear" });
	}

	dispose(): void {
		this.failPending(new Error("content index worker disposed"));
		this.worker.terminate();
		URL.revokeObjectURL(this.blobUrl);
	}

	private failPending(error: Error): void {
		for (const entry of Array.from(this.pending.values())) entry.reject(error);
		this.pending.clear();
	}
}
