import { App, TFile } from "obsidian";
import { WORKER_SOURCE } from "../core/workerSource.mjs";

export interface WorkerIndexRow {
	path: string;
	line: number;
	snippet: string;
	score: number;
}

/**
 * Off-main-thread content index. File reads still happen on the main thread
 * (only it can touch the vault); the retained text and the scan live in the
 * worker. Callers must be ready for `search` to reject (worker died) and
 * fall back to an in-process index.
 */
export class WorkerIndex {
	private built = false;
	private buildPromise: Promise<void> | null = null;
	private nextId = 1;
	private pending = new Map<number, { resolve: (rows: WorkerIndexRow[]) => void; reject: (err: Error) => void }>();

	/** Returns null when Workers/Blob URLs aren't available in this environment. */
	static create(app: App): WorkerIndex | null {
		try {
			const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
			const worker = new Worker(url);
			return new WorkerIndex(app, worker, url);
		} catch {
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
	}

	/**
	 * Stream every markdown file into the worker once, coalescing concurrent
	 * callers. Message ordering guarantees a search posted afterwards sees the
	 * complete index.
	 */
	private ensureBuilt(): Promise<void> {
		if (this.buildPromise) return this.buildPromise;
		if (this.built) return Promise.resolve();
		this.buildPromise = (async () => {
			for (const file of this.app.vault.getMarkdownFiles()) {
				try {
					const content = await this.app.vault.cachedRead(file);
					this.worker.postMessage({ type: "set", path: file.path, content });
				} catch {
					// Skip a file that vanished or is unreadable mid-build.
				}
			}
			this.built = true;
		})().finally(() => {
			this.buildPromise = null;
		});
		return this.buildPromise;
	}

	async search(tokens: string[], limit: number, excluded: string[]): Promise<WorkerIndexRow[]> {
		await this.ensureBuilt();
		return new Promise<WorkerIndexRow[]>((resolve, reject) => {
			const id = this.nextId++;
			this.pending.set(id, { resolve, reject });
			try {
				this.worker.postMessage({ type: "search", id, tokens, limit, excluded });
			} catch (err) {
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
		this.built = false;
		this.worker.postMessage({ type: "clear" });
	}

	dispose(): void {
		this.failPending(new Error("content index worker disposed"));
		this.worker.terminate();
		URL.revokeObjectURL(this.blobUrl);
	}

	private failPending(error: Error): void {
		for (const entry of this.pending.values()) entry.reject(error);
		this.pending.clear();
	}
}
