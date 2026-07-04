import { App, TFile } from "obsidian";
import { compareContentRows, MAX_INDEXED_LINE_LEN, type ContentSearchResult } from "./ContentSearcher";

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
		// Desktop only: Electron exposes require on the window; on mobile this
		// is undefined and the caller falls back to the in-memory index.
		const req = (window as unknown as { require?: (id: string) => unknown }).require;
		if (!req) return null;
		return req("child_process") as ChildProcessModule;
	} catch {
		return null;
	}
}

function getEnv(name: string): string {
	try {
		const proc = (window as unknown as { process?: { env?: Record<string, string | undefined> } })
			.process;
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
	return Array.from(new Set(candidates));
}

export class RipgrepSearcher {
	/** The command that answered `--version`, or null when none did. */
	private resolvedCommand: string | null | undefined = undefined;
	/** In-flight probe, shared so fast typing doesn't launch duplicate cascades. */
	private resolvePromise: Promise<string | null> | null = null;
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
	private resolveCommand(): Promise<string | null> {
		if (this.resolvedCommand !== undefined) return Promise.resolve(this.resolvedCommand);
		// Coalesce concurrent callers (fast typing) onto one probe cascade instead
		// of each re-running the serial candidate loop and its `rg --version` spawns.
		if (this.resolvePromise) return this.resolvePromise;
		this.resolvePromise = (async () => {
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
		})().finally(() => {
			this.resolvePromise = null;
		});
		return this.resolvePromise;
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
			// Per-file match cap. It exists only to bound the pipe (a common word in
			// a huge vault), NOT to diversify results — so it must be generous enough
			// that a single dense file isn't truncated below the requested `limit`
			// (the in-process fallback has no per-file cap, so a tight cap here made rg
			// return fewer results for the same query). A multi-word query needs even
			// more anchor hits per file because the all-tokens filter below discards
			// anchor-only lines — so the multi cap mirrors the in-process fallback's
			// own working-set bound (softCap = max(limit*10, 500) in ContentSearcher),
			// meaning a file would need more anchor hits than the fallback ever
			// considers before rg could return fewer results. maxBuffer overflow is
			// handled gracefully downstream.
			multi ? String(Math.max(options.limit * 10, 500)) : String(options.limit),
			// Cap line length so a minified/one-line file can't blow maxBuffer.
			// `--max-columns-preview` still prints a usable prefix of an over-long line
			// instead of an "omitted" notice, so the AND filter and snippet below see
			// real text. Kept equal to MAX_INDEXED_LINE_LEN (the fallback/worker line
			// cap) so a match in columns 501–2000 doesn't exist on mobile/fallback yet
			// vanish under ripgrep.
			"--max-columns",
			String(MAX_INDEXED_LINE_LEN),
			"--max-columns-preview",
			// Markdown only. Canvas (single-line JSON) and Bases (YAML) are
			// searched by their structure-aware searchers in ContentSearcher, not
			// by rg line globs that would mangle their snippets.
			"-g",
			"*.md",
		];

		for (const folder of options.excludeFolders ?? []) {
			const f = folder.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
			// --iglob (case-insensitive) so excluding "notes" also skips "Notes",
			// matching the in-process fallback, which lowercases both sides. A
			// case-sensitive -g here would leak excluded folders into rg results
			// only, giving different output depending on whether rg resolved.
			if (f) args.push("--iglob", `!${f}/**`);
		}

		// Search "." with cwd=vaultPath so rg emits vault-relative paths that
		// map straight onto TFile.path (no absolute-prefix / drive-colon parsing).
		args.push("--", anchor, ".");

		const needAll = multi ? tokens.map((t) => t.toLowerCase()) : null;

		// A new keystroke supersedes any still-running search: kill it so fast
		// typing can't stack up concurrent full-vault rg processes.
		this.dispose();

		return new Promise<ContentSearchResult[] | null>((resolve) => {
			let child: { kill: () => boolean; superseded?: boolean };
			try {
				child = cp.execFile(
					command,
					args,
					{
						cwd: vaultPath,
						timeout: 8000,
						maxBuffer: 32 * 1024 * 1024,
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
						// Buffer overflow on a very common token ("the", "note"): rg
						// killed the pipe but the stdout we captured is real match
						// lines, and parseOutput slices to `limit` anyway. Use the
						// partial output instead of returning null — otherwise every
						// keystroke for a common query rebuilds a full-vault index,
						// exactly the work rg was meant to avoid.
						if (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
							resolve(this.parseOutput(String(stdout ?? ""), options.limit, needAll));
							return;
						}
						// Spawn failure (ENOENT): the cached binary moved or was
						// uninstalled. Clear the cache so the next search re-probes the
						// candidate locations instead of spawn-erroring on every
						// keystroke and silently falling back forever.
						if (error.code === "ENOENT") this.resolvedCommand = undefined;
						// Any other failure (timeout, crash) → fall back.
						resolve(null);
					}
				);
			} catch {
				// Synchronous spawn throw is also a "binary gone" signal — re-probe
				// next time rather than trusting the stale resolved command.
				this.resolvedCommand = undefined;
				resolve(null);
				return;
			}
			this.currentChild = child;
		});
	}

	/** Kill any in-flight rg process (plugin unload, or command change). */
	dispose(): void {
		if (this.currentChild) {
			this.currentChild.superseded = true;
			try {
				this.currentChild.kill();
			} catch {
				// Process may have already exited.
			}
			this.currentChild = null;
		}
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
			const resolved = this.resolveRgLine(line, () => (suffixMap ??= this.buildSuffixMap()));
			if (!resolved) continue;
			const { file, lineNum, snippet } = resolved;

			// AND filter for multi-word queries: rg only guaranteed the anchor
			// token; require every token to appear on the line.
			if (needAll) {
				const low = snippet.toLowerCase();
				if (!needAll.every((tk) => low.includes(tk))) continue;
			}

			results.push({
				file,
				line: lineNum,
				snippet: snippet.trim().slice(0, 160),
				// Gentle early-line preference with a floor — never negative, so a
				// late-line match can't sort below everything regardless of relevance.
				// Base 100 (NOT higher) so it matches the in-process/worker markdown
				// score exactly: canvas (90) and base (85) rows merge against whichever
				// engine ran, so a mismatched base here would flip the relative order of
				// a canvas/base hit vs a deep-line markdown hit depending on whether
				// ripgrep happens to be installed. Keep all three markdown paths equal.
				score: Math.max(1, 100 - Math.floor(lineNum / 10)),
				engine: "ripgrep",
			});
		}

		// Same deterministic (score, path, line) comparator the worker and in-process
		// fallback use — so when no Canvas/Base rows are merged (mergeResults would
		// otherwise re-sort), tied ripgrep rows are ordered identically to the
		// fallback rather than by rg's file-walk order.
		return results.sort(compareContentRows).slice(0, limit);
	}

	/**
	 * Parse one `path:line:content` rg output line into a resolved file + line +
	 * snippet. Both the path (colons are legal in filenames on macOS/Linux) and the
	 * content can contain ":<digits>:", so the split point is ambiguous from the
	 * text alone — e.g. `plan:1:draft.md:5:text` could split at `:1:` or `:5:`. Try
	 * each `:<digits>:` boundary left-to-right and take the FIRST whose path
	 * resolves to a real vault file; that disambiguates a colon-in-path from a
	 * colon-in-content. Returns null when nothing resolves (dropped, as before).
	 */
	private resolveRgLine(
		line: string,
		getSuffixMap: () => Map<string, TFile>
	): { file: TFile; lineNum: number; snippet: string } | null {
		const re = /:(\d+):/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(line)) !== null) {
			const rawPath = line.slice(0, m.index);
			if (!rawPath) continue;
			const normalized = rawPath.replace(/\\/g, "/").replace(/^\.\//, "");
			let file: TFile | undefined;
			const direct = this.app.vault.getAbstractFileByPath(normalized);
			if (direct instanceof TFile) {
				file = direct;
			} else {
				file = this.findFileBySuffix(getSuffixMap(), normalized);
			}
			if (file) {
				return { file, lineNum: Number(m[1]), snippet: line.slice(m.index + m[0].length) };
			}
		}
		return null;
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
		for (const [key, file] of fileMap) {
			// Require a path-separator boundary so "notes.md" can't claim a
			// match that actually lives in "Bar/mynotes.md".
			if (key === suffix || key.endsWith(`/${suffix}`) || suffix.endsWith(`/${key}`)) return file;
		}
		return undefined;
	}
}
