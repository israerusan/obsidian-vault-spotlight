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

	async search(
		query: string,
		options: { includeCanvas: boolean; limit: number }
	): Promise<ContentSearchResult[]> {
		if (!query.trim()) return [];
		const execFileAsync = getExecFileAsync();
		if (!execFileAsync || !(await this.isAvailable())) return [];

		const vaultPath = (this.app.vault.adapter as { basePath?: string }).basePath;
		if (!vaultPath) return [];

		const args = [
			"-i",
			"--line-number",
			"--no-heading",
			"--color",
			"never",
			"--max-count",
			"4",
			"-g",
			"*.md",
		];

		if (options.includeCanvas) {
			args.push("-g", "*.canvas");
		}

		args.push("--", query, vaultPath);

		try {
			const { stdout } = await execFileAsync(this.command, args, {
				timeout: 8000,
				maxBuffer: 4 * 1024 * 1024,
				windowsHide: true,
			});
			return this.parseOutput(String(stdout), options.limit);
		} catch (error: unknown) {
			const err = error as { stdout?: string; code?: number };
			if (err.code === 1 && err.stdout) {
				return this.parseOutput(String(err.stdout), options.limit);
			}
			return [];
		}
	}

	private parseOutput(output: string, limit: number): ContentSearchResult[] {
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
			const normalized = rawPath.replace(/\\/g, "/");
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