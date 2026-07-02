import { Notice, Plugin, TFile } from "obsidian";
import {
	DEFAULT_SETTINGS,
	MAX_CUSTOM_SEARCHES,
	MAX_RECENT_COMMANDS,
	MAX_RECENT_SEARCHES,
	VaultSpotlightSettingTab,
	type CustomSearch,
	type VaultSpotlightSettings,
} from "./settings";
import { MODE_ORDER, SpotlightModal, type SpotlightMode } from "./spotlight/SpotlightModal";
import { LicenseManager } from "./license/LicenseManager";
import { ContentSearcher } from "./search/ContentSearcher";
import { normalizeProfiles } from "./core/searchProfiles.mjs";
import {
	normalizeEscapeChar,
	normalizeModePrefixes,
	previousFilePath,
	pushRecentCommand,
} from "./core/modeTriggers.mjs";

const MAX_FRECENCY_ENTRIES = 500;

export interface VaultSpotlightApi {
	/** Open the Spotlight modal, optionally with a prefilled query and mode. */
	open: (query?: string, mode?: string) => void;
	/** Content search across the vault (Pro). Resolves [] on the free tier. */
	search: (query: string) => Promise<
		Array<{ path: string; basename: string; line: number; snippet: string; score: number; engine: string }>
	>;
	isProActive: () => boolean;
}

function isSpotlightMode(value: unknown): value is SpotlightMode {
	return typeof value === "string" && (MODE_ORDER as string[]).includes(value);
}

export default class VaultSpotlightPlugin extends Plugin {
	settings: VaultSpotlightSettings = DEFAULT_SETTINGS;
	contentSearcher!: ContentSearcher;
	private activeSpotlight: SpotlightModal | null = null;
	private saveTimer: number | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();
		await this.refreshLicense();

		this.contentSearcher = new ContentSearcher(this.app, this.settings.ripgrepCommand);

		this.addRibbonIcon("search", "Vault Spotlight", () => this.openSpotlight());
		// No default hotkey (per Obsidian plugin guidelines — avoids conflicts);
		// users bind their own under Settings → Hotkeys.
		this.addCommand({
			id: "open-spotlight",
			name: "Open spotlight",
			callback: () => this.openSpotlight(),
		});
		this.addCommand({
			id: "search-contents",
			name: "Search file contents",
			callback: () => this.openSpotlight("", "content"),
		});
		this.addCommand({
			id: "go-to-heading",
			name: "Go to heading",
			callback: () => this.openSpotlight("", "headings"),
		});
		this.addCommand({
			id: "run-command",
			name: "Run command",
			callback: () => this.openSpotlight("", "commands"),
		});
		this.addCommand({
			id: "go-to-symbol",
			name: "Go to symbol in active note",
			callback: () => this.openSpotlight("", "symbols"),
		});
		this.addCommand({
			id: "open-editors",
			name: "Switch between open editors",
			callback: () => this.openSpotlight("", "editors"),
		});
		this.addCommand({
			id: "browse-folders",
			name: "Browse folders",
			callback: () => this.openSpotlight("", "folders"),
		});
		this.addCommand({
			id: "browse-links",
			name: "Browse backlinks and outlinks",
			callback: () => this.openSpotlight("", "links"),
		});
		this.addCommand({
			id: "switch-to-last-file",
			name: "Switch to last file",
			callback: () => void this.switchToLastFile(),
		});

		this.addCommand({
			id: "toggle-star-current-file",
			name: "Toggle star on current file",
			checkCallback: (checking) => {
				if (!this.settings.isPro) return false;
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				if (!checking) this.toggleStar(file.path);
				return true;
			},
		});

		// Custom searches are a Pro feature; don't leave their commands live if
		// the license has lapsed.
		if (this.settings.isPro) {
			for (const search of this.settings.customSearches) {
				this.registerCustomSearchCommand(search);
			}
		}

		// Register vault listeners only once the workspace is ready — Obsidian
		// fires "create" for every file during initial vault load, which would
		// otherwise flood these handlers at startup.
		this.app.workspace.onLayoutReady(() => {
			// Maintain the content index incrementally instead of wiping it on
			// every edit (which forced a full-vault re-read on the next search).
			this.registerEvent(
				this.app.vault.on("modify", (file) => {
					if (file instanceof TFile) void this.contentSearcher.updateFile(file);
				})
			);
			this.registerEvent(
				this.app.vault.on("create", (file) => {
					if (file instanceof TFile) void this.contentSearcher.updateFile(file);
				})
			);
			this.registerEvent(
				this.app.vault.on("delete", (file) => {
					this.contentSearcher.removeFile(file.path);
					this.untrackPath(file.path);
				})
			);
			this.registerEvent(
				this.app.vault.on("rename", (file, oldPath) => {
					this.contentSearcher.removeFile(oldPath);
					if (file instanceof TFile) void this.contentSearcher.updateFile(file);
					this.renamePath(oldPath, file.path);
				})
			);
			this.registerEvent(
				this.app.workspace.on("file-open", (file) => {
					if (file) this.trackRecent(file.path);
				})
			);
		});

		// obsidian://vault-spotlight?vault=...&query=...&mode=content opens the
		// modal from outside Obsidian (browser extensions, launchers, scripts).
		this.registerObsidianProtocolHandler("vault-spotlight", (params) => {
			const mode = isSpotlightMode(params.mode) ? params.mode : "files";
			this.openSpotlight(params.query ?? "", mode);
		});

		// Public API for other plugins and scripts (Omnisearch-style global).
		(globalThis as Record<string, unknown>).vaultSpotlight = this.createApi();

		this.addSettingTab(new VaultSpotlightSettingTab(this.app, this));
	}

	onunload(): void {
		// Close any open modal so its self-managed metadataCache listener and
		// pending focus timers are released with the plugin.
		this.activeSpotlight?.close();
		this.activeSpotlight = null;
		const globals = globalThis as Record<string, unknown>;
		if (globals.vaultSpotlight) delete globals.vaultSpotlight;
		this.flushSave();
	}

	/**
	 * Public API exposed as `globalThis.vaultSpotlight` so other plugins,
	 * scripts, and external tools can build on Spotlight.
	 */
	private createApi(): VaultSpotlightApi {
		return {
			open: (query = "", mode = "files") => {
				this.openSpotlight(query, isSpotlightMode(mode) ? mode : "files");
			},
			search: async (query: string) => {
				// Content search is a Pro feature; the API honors the same gate.
				if (!this.settings.isPro) {
					console.warn("[VaultSpotlight] api.search requires a Pro license.");
					return [];
				}
				const results = await this.contentSearcher.search(query, {
					useRipgrep: true,
					includeCanvas: this.settings.includeCanvas,
					includeBases: this.settings.includeBases,
					excludeFolders: this.settings.excludeFolders,
				});
				return results.map((r) => ({
					path: r.file.path,
					basename: r.file.basename,
					line: r.line,
					snippet: r.snippet,
					score: r.score,
					engine: r.engine,
				}));
			},
			isProActive: () => this.settings.isPro,
		};
	}

	openSpotlight(initialQuery = "", initialMode: SpotlightMode = "files"): void {
		this.activeSpotlight?.close();
		this.activeSpotlight = new SpotlightModal(this.app, this, initialQuery, initialMode);
		this.activeSpotlight.open();
	}

	onSpotlightClosed(modal: SpotlightModal): void {
		if (this.activeSpotlight === modal) {
			this.activeSpotlight = null;
		}
	}

	registerCustomSearchCommand(search: CustomSearch): void {
		this.addCommand({
			id: `custom-search-${search.id}`,
			name: search.name,
			callback: () => this.openSpotlight(search.query),
		});
	}

	deleteCustomSearch(id: string): void {
		this.settings.customSearches = this.settings.customSearches.filter((s) => s.id !== id);
		this.settings.pinnedCustomSearchIds = this.settings.pinnedCustomSearchIds.filter((pinnedId) => pinnedId !== id);
		const commands = (
			this.app as unknown as { commands?: { removeCommand?: (id: string) => void } }
		).commands;
		commands?.removeCommand?.(`${this.manifest.id}:custom-search-${id}`);
		void this.saveSettings();
	}

	togglePinnedCollection(id: string): boolean {
		if (!this.settings.isPro) return false;
		if (this.settings.pinnedCustomSearchIds.includes(id)) {
			this.settings.pinnedCustomSearchIds = this.settings.pinnedCustomSearchIds.filter((pinnedId) => pinnedId !== id);
			void this.saveSettings();
			return false;
		}
		this.settings.pinnedCustomSearchIds = [id, ...this.settings.pinnedCustomSearchIds.filter((pinnedId) => pinnedId !== id)];
		void this.saveSettings();
		return true;
	}

	trackRecent(path: string): void {
		if (this.settings.recentPaths[0] !== path) {
			const recent = this.settings.recentPaths.filter((p) => p !== path);
			recent.unshift(path);
			this.settings.recentPaths = recent.slice(0, this.settings.maxRecent);
		}
		this.bumpFrecency(path);
		this.scheduleSave();
	}

	/** Open the most recent file that isn't the active one (quick file toggle). */
	async switchToLastFile(): Promise<void> {
		const active = this.app.workspace.getActiveFile();
		const path = previousFilePath(this.settings.recentPaths, active?.path ?? "");
		const file = path ? this.app.vault.getAbstractFileByPath(path) : null;
		if (!(file instanceof TFile)) {
			new Notice("Vault Spotlight: no previous file yet.");
			return;
		}
		await this.app.workspace.getLeaf(false).openFile(file);
		this.trackRecent(file.path);
	}

	/** Record an executed command so it resurfaces on an empty command query. */
	trackCommand(id: string): void {
		this.settings.recentCommandIds = pushRecentCommand(this.settings.recentCommandIds, id, MAX_RECENT_COMMANDS);
		this.scheduleSave();
	}

	/** Record a query in the recent-searches list (most-recent first, de-duped). */
	trackSearch(query: string): void {
		const q = query.trim();
		if (!q) return;
		const next = this.settings.recentSearches.filter((s) => s.toLowerCase() !== q.toLowerCase());
		next.unshift(q);
		this.settings.recentSearches = next.slice(0, MAX_RECENT_SEARCHES);
		this.scheduleSave();
	}

	/**
	 * File paths from Obsidian's core Bookmarks plugin (flattened across groups).
	 * The bookmarks API isn't in the public typings, so it's read defensively and
	 * returns [] whenever the plugin is disabled or the shape is unexpected.
	 */
	getBookmarkedPaths(): string[] {
		try {
			const internal = (
				this.app as unknown as {
					internalPlugins?: {
						getPluginById?: (id: string) => { instance?: { getBookmarks?: () => unknown[] } } | null;
					};
				}
			).internalPlugins;
			const instance = internal?.getPluginById?.("bookmarks")?.instance;
			const bookmarks = instance?.getBookmarks?.();
			if (!Array.isArray(bookmarks)) return [];

			const paths: string[] = [];
			const walk = (items: unknown[]): void => {
				for (const raw of items) {
					const item = raw as { type?: string; path?: string; items?: unknown[] };
					if (item?.type === "file" && typeof item.path === "string") {
						paths.push(item.path);
					} else if (Array.isArray(item?.items)) {
						walk(item.items);
					}
				}
			};
			walk(bookmarks);
			return paths;
		} catch {
			return [];
		}
	}

	private bumpFrecency(path: string): void {
		const fr = this.settings.fileFrecency;
		const entry = fr[path] ?? { count: 0, last: 0 };
		entry.count += 1;
		entry.last = Date.now();
		fr[path] = entry;
		this.pruneFrecency();
	}

	private pruneFrecency(): void {
		const keys = Object.keys(this.settings.fileFrecency);
		if (keys.length <= MAX_FRECENCY_ENTRIES) return;
		const sorted = keys.sort(
			(a, b) => this.settings.fileFrecency[b].last - this.settings.fileFrecency[a].last
		);
		const next: Record<string, { count: number; last: number }> = {};
		for (const key of sorted.slice(0, MAX_FRECENCY_ENTRIES)) {
			next[key] = this.settings.fileFrecency[key];
		}
		this.settings.fileFrecency = next;
	}

	toggleStar(path: string): boolean {
		if (!this.settings.isPro) return false;
		if (this.settings.starredPaths.includes(path)) {
			this.settings.starredPaths = this.settings.starredPaths.filter((p) => p !== path);
			void this.saveSettings();
			return false;
		}
		const starred = this.settings.starredPaths.filter((p) => p !== path);
		starred.unshift(path);
		this.settings.starredPaths = starred.slice(0, this.settings.maxStarred);
		void this.saveSettings();
		return true;
	}

	isStarred(path: string): boolean {
		return this.settings.starredPaths.includes(path);
	}

	private untrackPath(path: string): void {
		this.settings.recentPaths = this.settings.recentPaths.filter((p) => p !== path);
		this.settings.starredPaths = this.settings.starredPaths.filter((p) => p !== path);
		delete this.settings.fileFrecency[path];
		void this.saveSettings();
	}

	private renamePath(oldPath: string, newPath: string): void {
		const swap = (arr: string[]) => arr.map((p) => (p === oldPath ? newPath : p));
		this.settings.recentPaths = swap(this.settings.recentPaths);
		this.settings.starredPaths = swap(this.settings.starredPaths);
		const fr = this.settings.fileFrecency;
		if (fr[oldPath]) {
			fr[newPath] = fr[oldPath];
			delete fr[oldPath];
		}
		this.scheduleSave();
	}

	async refreshLicense(): Promise<boolean> {
		const before = this.settings.isPro;
		if (!this.settings.licenseKey) {
			if (!this.settings.isPro && !this.settings.licenseEmail) return false;
			this.settings.isPro = false;
			this.settings.licenseEmail = "";
			await this.saveSettings();
			return before !== this.settings.isPro;
		}
		const result = LicenseManager.verify(this.settings.licenseKey);
		const isPro = result.valid;
		const licenseEmail = result.email ?? "";
		// Save even when Pro status is unchanged: the key text itself may have
		// been edited (e.g. an invalid/typo'd key), and without a save it would
		// silently vanish on the next restart.
		this.settings.isPro = isPro;
		this.settings.licenseEmail = licenseEmail;
		await this.saveSettings();
		return before !== isPro;
	}

	async loadSettings(): Promise<void> {
		const data: unknown = await this.loadData();
		const loaded =
			data !== null && typeof data === "object" ? (data as Partial<VaultSpotlightSettings>) : {};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);

		if (!Array.isArray(this.settings.recentPaths)) this.settings.recentPaths = [];
		if (!Array.isArray(this.settings.starredPaths)) this.settings.starredPaths = [];
		if (!Array.isArray(this.settings.pinnedCustomSearchIds)) this.settings.pinnedCustomSearchIds = [];
		this.settings.searchProfiles = normalizeProfiles(this.settings.searchProfiles);
		if (typeof this.settings.searchAliases !== "string") this.settings.searchAliases = "";
		if (!this.settings.searchProfiles.some((profile) => profile.id === this.settings.activeProfileId)) {
			this.settings.activeProfileId = "";
		}
		if (!Array.isArray(this.settings.excludeFolders)) this.settings.excludeFolders = [];
		if (!Array.isArray(this.settings.recentSearches)) {
			this.settings.recentSearches = [];
		} else {
			this.settings.recentSearches = this.settings.recentSearches
				.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
				.slice(0, MAX_RECENT_SEARCHES);
		}
		if (this.settings.fileFrecency === null || typeof this.settings.fileFrecency !== "object") {
			this.settings.fileFrecency = {};
		}
		this.settings.modePrefixes = normalizeModePrefixes(this.settings.modePrefixes);
		this.settings.escapeChar = normalizeEscapeChar(this.settings.escapeChar);
		this.settings.defaultNewTab = this.settings.defaultNewTab === true;
		this.settings.recentCommandIds = (Array.isArray(this.settings.recentCommandIds) ? this.settings.recentCommandIds : [])
			.filter((id): id is string => typeof id === "string" && id.length > 0)
			.slice(0, MAX_RECENT_COMMANDS);

		// Coerce the caps so a corrupt data.json (NaN/0/negative) can't make
		// slice(0, cap) silently wipe recents/stars.
		this.settings.maxRecent = coercePositiveInt(this.settings.maxRecent, DEFAULT_SETTINGS.maxRecent);
		this.settings.maxStarred = coercePositiveInt(this.settings.maxStarred, DEFAULT_SETTINGS.maxStarred);

		// Drop malformed custom-search entries and enforce the cap.
		if (!Array.isArray(this.settings.customSearches)) {
			this.settings.customSearches = [];
		} else {
			this.settings.customSearches = this.settings.customSearches
				.filter(
					(s): s is CustomSearch =>
						!!s &&
						typeof s.id === "string" &&
						s.id.length > 0 &&
						typeof s.name === "string" &&
						typeof s.query === "string"
				)
				.slice(0, MAX_CUSTOM_SEARCHES);
		}
		const customSearchIds = new Set(this.settings.customSearches.map((search) => search.id));
		this.settings.pinnedCustomSearchIds = this.settings.pinnedCustomSearchIds
			.filter((id): id is string => typeof id === "string" && customSearchIds.has(id));

		// Enforce caps against what was loaded from disk.
		this.settings.recentPaths = this.settings.recentPaths.slice(0, this.settings.maxRecent);
		this.settings.starredPaths = this.settings.starredPaths.slice(0, this.settings.maxStarred);
	}

	private scheduleSave(): void {
		if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
		this.saveTimer = window.setTimeout(() => {
			this.saveTimer = null;
			void this.saveSettings();
		}, 1500);
	}

	private flushSave(): void {
		if (this.saveTimer !== null) {
			window.clearTimeout(this.saveTimer);
			this.saveTimer = null;
			void this.saveSettings();
		}
	}

	async saveSettings(): Promise<void> {
		try {
			await this.saveData(this.settings);
		} catch (err) {
			console.error("[VaultSpotlight] failed to save settings", err);
		}
	}
}

function coercePositiveInt(value: unknown, fallback: number): number {
	return Number.isFinite(value) && (value as number) > 0 ? Math.floor(value as number) : fallback;
}
