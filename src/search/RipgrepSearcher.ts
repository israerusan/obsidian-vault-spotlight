import { App, TFile } from "obsidian";
import type { ContentSearchResult } from "./ContentSearcher";

interface ExecResult {
	stdout: string;
	stderr: string;
}

type ExecFileFn = (
	command: string,
	args: string[],
	options: Record<string, unknown>
) => Promise<ExecResult>;

function getExecFileAsync(): ExecFileFn | null {
	try {
		const req = (globalThis as { require?: (id: string) => unknown }).require;
		if (!req) return null;
		const childProcess = req("child_process") as { execFile: (...args: unknown[]) => void };
		const util = req("util") as { promisify: (fn: unknown) => ExecFileFn };
		return util.promisify(childProcess.execFile);
	} catch {
		return null;
	}
}

export class RipgrepSearcher {
	private available: boolean | null = null;

	constructor(
		private app: App,
		private command: string
	) {}

	async isAvailable(): Promise<boolean> {
		if (this.available !== null) return this.available;
		const execFileAsync = getExecFileAsync();
		if (!execFileAsync) {
			this.available = false;
			return false;
		}
		try {
			await execFileAsync(this.command, ["--version"], { timeout: 3000, windowsHide: true });
			this.available = true;
		} catch {
			this.available = false;
		}
		return this.available;
	}

	/**
	 * Returns matches, or `null` when ripgrep could not run at all (missing
	 * binary, no vault path, or a non-"no-match" error). A `null` return is the
	 * caller's signal to fall back to the in-memory index; an empty array means
	 * ripgrep ran fine and genuinely found nothing — the caller should trust it
	 * and NOT build a full-vault index just to also find nothing.
	 */
	async search(
		query: string,
		options: { includeCanvas: boolean; limit: number; excludeFolders?: string[] }
	): Promise<ContentSearchResult[] | null> {
		const tokens = query.trim().split(/\s+/).filter(Boolean);
		if (tokens.length === 0) return [];
		const execFileAsync = getExecFileAsync();
		if (!execFileAsync || !(await this.isAvailable())) return null;

		const vaultPath = (this.app.vault.adapter as { basePath?: string }).basePath;
		if (!vaultPath) return null;

		// Anchor rg on the longest (typically most selective) token, then verify
		// the remaining tokens against each returned line for AND semantics —
		// rg's default regex engine can't express unordered "contains all".
		const anchor = tokens.reduce((a, b) => (b.length >= a.length ? b : a));
		const multi = tokens.length > 1;

		const args = [
			"-i",
			// Treat the query literally, matching the vault/canvas fallback's
			// String.includes semantics. Without this, regex metacharacters give
			// different (or invalid → empty) results depending on rg availability.
			"--fixed-strings",
			"--line-number",
			"--no-heading",
			"--color",
			"never",
			"--no-follow",
			"--max-count",
			// A multi-word query needs more anchor hits per file to survive the
			// all-tokens filter below; a single word keeps the tight cap.
			multi ? "40" : "4",
			// Cap line length so a minified/one-line file can't blow maxBuffer.
			"--max-columns",
			"500",
			"-g",
			"*.md",
		];

		if (options.includeCanvas) {
			args.push("-g", "*.canvas");
		}

		for (const folder of options.excludeFolders ?? []) {
			const f = folder.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
			if (f) args.push("-g", `!${f}/**`);
		}

		// Search "." with cwd=vaultPath so rg emits vault-relative paths that
		// map straight onto TFile.path (no absolute-prefix / drive-colon parsing).
		args.push("--", anchor, ".");

		const needAll = multi ? tokens.map((t) => t.toLowerCase()) : null;

		try {
			const { stdout } = await execFileAsync(this.command, args, {
				cwd: vaultPath,
				timeout: 8000,
				maxBuffer: 16 * 1024 * 1024,
				windowsHide: true,
			});
			return this.parseOutput(String(stdout), options.limit, needAll);
		} catch (error: unknown) {
			const err = error as { stdout?: string; code?: number };
			// Exit code 1 = ran successfully, no matches. Trust it (return the
			// parsed — usually empty — result, NOT null).
			if (err.code === 1) {
				return this.parseOutput(String(err.stdout ?? ""), options.limit, needAll);
			}
			// Any other exit code means rg genuinely failed → fall back.
			return null;
		}
	}

	private parseOutput(
		output: string,
		limit: number,
		needAll: string[] | null
	): ContentSearchResult[] {
		const fileMap = this.app.vault.getFiles().reduce((map, file) => {
			map.set(file.path, file);
			map.set(file.path.replace(/\\/g, "/"), file);
			return map;
		}, new Map<string, TFile>());

		const results: ContentSearchResult[] = [];
		const lines = output.split("\n").filter(Boolean);

		for (const line of lines) {
			const match = line.match(/^(.+?):(\d+):(.*)$/);
			if (!match) continue;

			const [, rawPath, lineNum, snippet] = match;

			// AND filter for multi-word queries: rg only guaranteed the anchor
			// token; require every token to appear on the line.
			if (needAll) {
				const low = snippet.toLowerCase();
				if (!needAll.every((tk) => low.includes(tk))) continue;
			}

			const normalized = rawPath.replace(/\\/g, "/").replace(/^\.\//, "");
			const file =
				fileMap.get(normalized) ??
				fileMap.get(normalized.split("/").slice(-3).join("/")) ??
				this.findFileBySuffix(fileMap, normalized);

			if (!file) continue;

			results.push({
				file,
				line: Number(lineNum),
				snippet: snippet.trim().slice(0, 160),
				score: 120 - Number(lineNum),
				engine: "ripgrep",
			});
		}

		return results.sort((a, b) => b.score - a.score).slice(0, limit);
	}

	private findFileBySuffix(fileMap: Map<string, TFile>, path: string): TFile | undefined {
		const suffix = path.replace(/\\/g, "/");
		for (const [key, file] of fileMap.entries()) {
			if (key.endsWith(suffix) || suffix.endsWith(key)) return file;
		}
		return undefined;
	}
}