import { App, TFile } from "obsidian";
import type { ContentSearchResult } from "./ContentSearcher";

interface ChildProcessModule {
	execFile: (
		command: string,
		args: string[],
		options: Record<string, unknown>,
		callback: (error: (Error & { code?: number | string; killed?: boolean }) | null, stdout: string) => void
	) => { kill: () => boolean };
}

function getChildProcess(): ChildProcessModule | null {
	try {
		const req = (globalThis as { require?: (id: string) => unknown }).require;
		if (!req) return null;
		return req("child_process") as ChildProcessModule;
	} catch {
		return null;
	}
}

function getEnv(name: string): string {
	try {
		const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
		return proc?.env?.[name] ?? "";
	} catch {
		return "";
	}
}

/**
 * Places `rg` commonly lives when it isn't on PATH, tried in order after the
 * configured command fails. VS Code bundles ripgrep, so many users have a
 * working binary without knowing it.
 */
function candidateCommands(configured: string): string[] {
	const candidates = [configured];
	if (configured !== "rg") candidates.push("rg");
	const home = getEnv("USERPROFILE") || getEnv("HOME");
	const localAppData = getEnv("LOCALAPPDATA");
	if (localAppData) {
		candidates.push(
			`${localAppData}\\Microsoft\\WinGet\\Links\\rg.exe`,
			`${localAppData}\\Programs\\Microsoft VS Code\\resources\\app\\node_modules\\@vscode\\ripgrep\\bin\\rg.exe`
		);
	}
	if (home) {
		candidates.push(`${home}\\scoop\\shims\\rg.exe`);
	}
	candidates.push(
		"C:\\ProgramData\\chocolatey\\bin\\rg.exe",
		"/opt/homebrew/bin/rg",
		"/usr/local/bin/rg",
		"/usr/bin/rg"
	);
	return [...new Set(candidates)];
}

export class RipgrepSearcher {
	/** The command that answered `--version`, or null when none did. */
	private resolvedCommand: string | null | undefined = undefined;
	private currentChild: { kill: () => boolean; superseded?: boolean } | null = null;

	constructor(
		private app: App,
		private command: string
	) {}

	async isAvailable(): Promise<boolean> {
		return (await this.resolveCommand()) !== null;
	}

	/**
	 * Try the configured command, then well-known install locations, caching
	 * whichever answers `--version` first.
	 */
	private async resolveCommand(): Promise<string | null> {
		if (this.resolvedCommand !== undefined) return this.resolvedCommand;
		const cp = getChildProcess();
		if (!cp) {
			this.resolvedCommand = null;
			return null;
		}
		for (const candidate of candidateCommands(this.command)) {
			const ok = await new Promise<boolean>((resolve) => {
				try {
					cp.execFile(candidate, ["--version"], { timeout: 3000, windowsHide: true }, (error) =>
						resolve(!error)
					);
				} catch {
					resolve(false);
				}
			});
			if (ok) {
				this.resolvedCommand = candidate;
				return candidate;
			}
		}
		this.resolvedCommand = null;
		return null;
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
		options: {
			includeCanvas: boolean;
			includeBases?: boolean;
			limit: number;
			excludeFolders?: string[];
		}
	): Promise<ContentSearchResult[] | null> {
		const tokens = query.trim().split(/\s+/).filter(Boolean);
		if (tokens.length === 0) return [];
		const cp = getChildProcess();
		const command = await this.resolveCommand();
		if (!cp || !command) return null;

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
			// Vaults are often git repos with a .gitignore; without this rg
			// silently skips ignored notes that Obsidian itself still indexes,
			// so Pro users would see FEWER results than the free fallback.
			// (Hidden/dot folders stay skipped — matching Obsidian's indexing.)
			"--no-ignore",
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

		if (options.includeBases) {
			args.push("-g", "*.base");
		}

		for (const folder of options.excludeFolders ?? []) {
			const f = folder.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
			if (f) args.push("-g", `!${f}/**`);
		}

		// Search "." with cwd=vaultPath so rg emits vault-relative paths that
		// map straight onto TFile.path (no absolute-prefix / drive-colon parsing).
		args.push("--", anchor, ".");

		const needAll = multi ? tokens.map((t) => t.toLowerCase()) : null;

		// A new keystroke supersedes any still-running search: kill it so fast
		// typing can't stack up concurrent full-vault rg processes.
		if (this.currentChild) {
			this.currentChild.superseded = true;
			try {
				this.currentChild.kill();
			} catch {
				// Process may have already exited.
			}
			this.currentChild = null;
		}

		return new Promise<ContentSearchResult[] | null>((resolve) => {
			let child: { kill: () => boolean; superseded?: boolean };
			try {
				child = cp.execFile(
					command,
					args,
					{
						cwd: vaultPath,
						timeout: 8000,
						maxBuffer: 16 * 1024 * 1024,
						windowsHide: true,
					},
					(error, stdout) => {
						if (this.currentChild === child) this.currentChild = null;
						if (!error) {
							resolve(this.parseOutput(String(stdout ?? ""), options.limit, needAll));
							return;
						}
						// Exit code 1 = ran successfully, no matches. Trust it (return
						// the parsed — usually empty — result, NOT null).
						if (error.code === 1) {
							resolve(this.parseOutput(String(stdout ?? ""), options.limit, needAll));
							return;
						}
						// Killed because a newer search superseded this one: return
						// empty (the caller's generation check discards it) rather
						// than null, which would trigger a pointless index build.
						if (child.superseded) {
							resolve([]);
							return;
						}
						// Any other failure (timeout, crash) → fall back.
						resolve(null);
					}
				);
			} catch {
				resolve(null);
				return;
			}
			this.currentChild = child;
		});
	}

	private parseOutput(
		output: string,
		limit: number,
		needAll: string[] | null
	): ContentSearchResult[] {
		const results: ContentSearchResult[] = [];
		const lines = output.split("\n").filter(Boolean);
		// Built lazily and only when a direct vault lookup misses (rare —
		// rg emits vault-relative paths that normally map straight to TFile.path).
		let suffixMap: Map<string, TFile> | null = null;

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
			let file: TFile | undefined;
			const direct = this.app.vault.getAbstractFileByPath(normalized);
			if (direct instanceof TFile) {
				file = direct;
			} else {
				suffixMap ??= this.buildSuffixMap();
				file = this.findFileBySuffix(suffixMap, normalized);
			}

			if (!file) continue;

			results.push({
				file,
				line: Number(lineNum),
				snippet: snippet.trim().slice(0, 160),
				// Gentle early-line preference with a floor — never negative, so a
				// late-line match can't sort below everything regardless of relevance.
				score: Math.max(1, 120 - Math.floor(Number(lineNum) / 10)),
				engine: "ripgrep",
			});
		}

		return results.sort((a, b) => b.score - a.score).slice(0, limit);
	}

	private buildSuffixMap(): Map<string, TFile> {
		const map = new Map<string, TFile>();
		for (const file of this.app.vault.getFiles()) {
			map.set(file.path, file);
		}
		return map;
	}

	private findFileBySuffix(fileMap: Map<string, TFile>, path: string): TFile | undefined {
		const suffix = path.replace(/\\/g, "/");
		for (const [key, file] of fileMap.entries()) {
			// Require a path-separator boundary so "notes.md" can't claim a
			// match that actually lives in "Bar/mynotes.md".
			if (key === suffix || key.endsWith(`/${suffix}`) || suffix.endsWith(`/${key}`)) return file;
		}
		return undefined;
	}
}
