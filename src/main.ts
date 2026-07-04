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
import { resolveLicenseTransition } from "./core/licenseTransition.mjs";
import { coerceOpenCount, nextOpenCount } from "./core/onboarding.mjs";
import { ContentSearcher } from "./search/ContentSearcher";
import { normalizeProfiles } from "./core/searchProfiles.mjs";
import { normalizeRankingSettings } from "./core/ranking.mjs";
import { normalizeWorkflowPresets } from "./core/workflowPresets.mjs";
import { normalizeSnippets } from "./core/snippets.mjs";
import {
	normalizeEscapeChar,
	normalizeModePrefixes,
	previousFilePath,
	pushRecentCommand,
	reconcileEscapeChar,
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
	private api: VaultSpotlightApi | null = null;
	// Flipped true by onLayoutReady. The vault listeners are registered eagerly (so
	// onunload always cleans them up) but no-op until this is set, which suppresses
	// the "create" flood Obsidian fires while loading the vault.
	private layoutReady = false;

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
			id: "run-action",
			name: "Run action",
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

		// Ignore Obsidian's initial-load event storm until the workspace is ready
		// (it fires "create" for every file during vault load). The listeners
		// themselves are registered eagerly below — NOT inside this callback — so
		// their registerEvent cleanup is always captured by onunload. Registering
		// inside onLayoutReady risks a leak: if the plugin is disabled before layout
		// is ready, onunload runs first and drains its cleanup list, then this
		// callback fires and attaches listeners bound to a dead instance that are
		// never removed.
		this.app.workspace.onLayoutReady(() => {
			this.layoutReady = true;
		});
		// Maintain the content index incrementally instead of wiping it on every
		// edit (which forced a full-vault re-read on the next search). Each handler
		// no-ops until layoutReady to skip the startup flood.
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (this.layoutReady && file instanceof TFile) void this.contentSearcher.updateFile(file);
			})
		);
		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (this.layoutReady && file instanceof TFile) void this.contentSearcher.updateFile(file);
			})
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (!this.layoutReady) return;
				this.contentSearcher.removeFile(file.path);
				this.untrackPath(file.path);
			})
		);
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (!this.layoutReady) return;
				this.contentSearcher.removeFile(oldPath);
				if (file instanceof TFile) void this.contentSearcher.updateFile(file);
				this.renamePath(oldPath, file.path);
			})
		);
		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (this.layoutReady && file) this.trackRecent(file.path);
			})
		);

		// obsidian://vault-spotlight?vault=...&query=...&mode=content opens the
		// modal from outside Obsidian (browser extensions, launchers, scripts).
		this.registerObsidianProtocolHandler("vault-spotlight", (params) => {
			const mode = isSpotlightMode(params.mode) ? params.mode : "files";
			this.openSpotlight(params.query ?? "", mode);
		});

		// Public API for other plugins and scripts (Omnisearch-style global).
		this.api = this.createApi();
		(window as unknown as Record<string, unknown>).vaultSpotlight = this.api;

		this.addSettingTab(new VaultSpotlightSettingTab(this.app, this));
	}

	onunload(): void {
		// Close any open modal so its self-managed metadataCache listener and
		// pending focus timers are released with the plugin.
		this.activeSpotlight?.close();
		this.activeSpotlight = null;
		this.contentSearcher?.dispose();
		// Identity check: only remove the global if it's still OUR object — a
		// second instance (e.g. a BRAT beta copy) may have claimed it since.
		const globals = window as unknown as Record<string, unknown>;
		if (this.api && globals.vaultSpotlight === this.api) delete globals.vaultSpotlight;
		this.api = null;
		this.flushSave();
	}

	/**
	 * Public API exposed as `globalThis.vaultSpotlight` so other plugins,
	 * scripts, and external tools can build on Spotlight.
	 */
	private createApi(): VaultSpotlightApi {
		return {
			open: (query = "", mode = "files") => {
				// Coerce the query: external callers can pass a non-string (number,
				// object) into this documented, stable contract, and the modal's
				// downstream .trim()/string ops would throw on it.
				const q = typeof query === "string" ? query : String(query ?? "");
				this.openSpotlight(q, isSpotlightMode(mode) ? mode : "files");
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
		// Count opens (capped) to drive first-run onboarding density. The cap means a
		// long-time user's data.json stops being rewritten once past it.
		const next = nextOpenCount(this.settings.openCount);
		if (next !== this.settings.openCount) {
			this.settings.openCount = next;
			void this.saveSettings();
		}
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
		try {
			await this.app.workspace.getLeaf(false).openFile(file);
			this.trackRecent(file.path);
		} catch (err) {
			console.error("[VaultSpotlight] switch to last file failed", err);
			new Notice("Vault Spotlight: could not open the previous file.");
		}
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

	/**
	 * Re-verify the license key (offline) and cache the result.
	 *
	 * `persistUnchanged` is for the settings tab, where the key TEXT was just
	 * edited: it must be saved even when the Pro status didn't flip, or an
	 * invalid/typo'd key silently vanishes on the next restart. Startup calls
	 * leave it false so an unchanged verification never writes data.json.
	 */
	async refreshLicense(persistUnchanged = false): Promise<boolean> {
		// The decision (next state + whether to persist / resync commands) is pure
		// and unit-tested in core/licenseTransition; this method just applies it.
		const verifyResult = this.settings.licenseKey ? LicenseManager.verify(this.settings.licenseKey) : null;
		const transition = resolveLicenseTransition(
			{ isPro: this.settings.isPro, email: this.settings.licenseEmail },
			this.settings.licenseKey,
			verifyResult,
			persistUnchanged
		);
		this.settings.isPro = transition.isPro;
		this.settings.licenseEmail = transition.email;
		if (transition.persist) await this.saveSettings();
		if (transition.syncCommands) this.syncCustomSearchCommands();
		return transition.changed;
	}

	/**
	 * Custom-search commands are Pro-only and are registered once at startup
	 * (onload). When the license flips at runtime, reconcile them without a
	 * restart: register them when Pro turns on, revoke them when it lapses — so a
	 * lapsed license can't leave a live Pro command (and its hotkey) in the
	 * palette, and a freshly-entered key resurfaces saved searches immediately.
	 */
	private syncCustomSearchCommands(): void {
		if (this.settings.isPro) {
			for (const search of this.settings.customSearches) this.registerCustomSearchCommand(search);
			return;
		}
		const commands = (
			this.app as unknown as { commands?: { removeCommand?: (id: string) => void } }
		).commands;
		for (const search of this.settings.customSearches) {
			commands?.removeCommand?.(`${this.manifest.id}:custom-search-${search.id}`);
		}
	}

	async loadSettings(): Promise<void> {
		const data: unknown = await this.loadData();
		const loaded =
			data !== null && typeof data === "object" ? (data as Partial<VaultSpotlightSettings>) : {};
		// Strip a JSON-injected "__proto__" key before the assign below. JSON.parse
		// makes it an own property, and Object.assign copies own keys via [[Set]] —
		// which for "__proto__" invokes the prototype setter and re-points
		// this.settings' prototype (a prototype-pollution vector on a corrupt/hostile
		// data.json). Own DEFAULT_SETTINGS keys still shadow reads, so isPro can't be
		// spoofed, but we don't want the tainted prototype at all.
		if (Object.prototype.hasOwnProperty.call(loaded, "__proto__")) {
			delete (loaded as Record<string, unknown>)["__proto__"];
		}
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);

		if (!Array.isArray(this.settings.recentPaths)) this.settings.recentPaths = [];
		if (!Array.isArray(this.settings.starredPaths)) this.settings.starredPaths = [];
		if (!Array.isArray(this.settings.pinnedCustomSearchIds)) this.settings.pinnedCustomSearchIds = [];
		this.settings.workflowPresets = normalizeWorkflowPresets(this.settings.workflowPresets);
		this.settings.searchProfiles = normalizeProfiles(this.settings.searchProfiles);
		this.settings.ranking = normalizeRankingSettings(this.settings.ranking);
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
		// Clone unconditionally: Object.assign above is shallow, so when data.json
		// has no fileFrecency this field still points at DEFAULT_SETTINGS' shared
		// object. bumpFrecency() mutates it in place, which would otherwise leak
		// one session's frecency into the module singleton on disable/re-enable.
		if (this.settings.fileFrecency === null || typeof this.settings.fileFrecency !== "object" || Array.isArray(this.settings.fileFrecency)) {
			this.settings.fileFrecency = {};
		} else {
			// Validate each entry's SHAPE too, not just the container's. A corrupt
			// data.json with a primitive/null value (e.g. `"a.md": 5`) would crash
			// bumpFrecency's `entry.count += 1` (write to a number) or pruneFrecency's
			// `[b].last` sort (deref of null) on the very next file open. Rebuild with
			// only well-formed {count, last} entries.
			const clean: Record<string, { count: number; last: number }> = {};
			for (const [key, value] of Object.entries(this.settings.fileFrecency)) {
				const entry = value as { count?: unknown; last?: unknown } | null;
				if (
					entry !== null &&
					typeof entry === "object" &&
					Number.isFinite(entry.count) &&
					Number.isFinite(entry.last)
				) {
					clean[key] = { count: entry.count as number, last: entry.last as number };
				}
			}
			this.settings.fileFrecency = clean;
		}
		// Enforce the entry cap on load too (not only after bumpFrecency): a corrupt
		// or hostile data.json with, say, 100k frecency keys would otherwise load
		// whole and be re-serialized on every save, self-healing only on the next
		// file open. Trim it to the top MAX_FRECENCY_ENTRIES by recency now.
		this.pruneFrecency();
		this.settings.modePrefixes = normalizeModePrefixes(this.settings.modePrefixes);
		this.settings.escapeChar = normalizeEscapeChar(this.settings.escapeChar);
		// The escape char is checked before mode prefixes, so if it equals one it
		// would silently make that mode unreachable. Reconcile to the default (or
		// a free spare) when the user's escape char collides with a live prefix.
		this.settings.escapeChar = reconcileEscapeChar(this.settings.escapeChar, this.settings.modePrefixes);
		this.settings.defaultNewTab = this.settings.defaultNewTab === true;
		// Coerce the remaining boolean toggles the same way (Object.assign copies a
		// corrupt data.json value like `"false"` — a truthy string — verbatim, which
		// would then drive behavior). Defaults: showModifiedTime/useFrecency and the
		// file-type includes are on, showPreview is off.
		this.settings.showModifiedTime = this.settings.showModifiedTime !== false;
		this.settings.useFrecency = this.settings.useFrecency !== false;
		this.settings.showPreview = this.settings.showPreview === true;
		this.settings.includeCanvas = this.settings.includeCanvas !== false;
		this.settings.includePdf = this.settings.includePdf !== false;
		this.settings.includeBases = this.settings.includeBases !== false;
		// Delight-layer settings: coerce to safe shapes.
		this.settings.enableCalculator = this.settings.enableCalculator !== false;
		this.settings.enableDateJump = this.settings.enableDateJump !== false;
		if (typeof this.settings.currencyRates !== "string") this.settings.currencyRates = "";
		if (typeof this.settings.captureInboxPath !== "string") this.settings.captureInboxPath = "";
		if (typeof this.settings.captureHeading !== "string") this.settings.captureHeading = "";
		this.settings.captureMode = this.settings.captureMode === "prepend" ? "prepend" : "append";
		this.settings.snippets = normalizeSnippets(this.settings.snippets);
		// Onboarding + schema marker: coerce defensively (old data.json lacks them;
		// Object.assign already supplied the defaults, this guards corrupt values).
		this.settings.openCount = coerceOpenCount(this.settings.openCount);
		this.settings.onboardingDismissed = this.settings.onboardingDismissed === true;
		this.settings.schemaVersion = Number.isInteger(this.settings.schemaVersion) ? this.settings.schemaVersion : 1;
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
		// workflowPresets was already capped by normalizeWorkflowPresets() above.

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

	// Serialize writes: overlapping saveData calls (e.g. per-keystroke license
	// verification) could otherwise finish out of order, letting a stale
	// serialization win on disk.
	private savePromise: Promise<void> = Promise.resolve();

	async saveSettings(): Promise<void> {
		this.savePromise = this.savePromise.then(async () => {
			try {
				await this.saveData(this.settings);
			} catch (err) {
				console.error("[VaultSpotlight] failed to save settings", err);
			}
		});
		return this.savePromise;
	}
}

function coercePositiveInt(value: unknown, fallback: number, max = 1000): number {
	// Guard NaN/0/negative (→ fallback) AND an absurdly large value (→ clamp): a
	// hostile data.json with maxRecent: 1e9 would otherwise remove the effective
	// growth cap on recentPaths/starredPaths.
	if (!Number.isFinite(value) || (value as number) <= 0) return fallback;
	return Math.min(Math.floor(value as number), max);
}
