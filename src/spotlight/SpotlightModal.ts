import {
	App,
	type EventRef,
	MarkdownView,
	Menu,
	Notice,
	Modal,
	TFile,
	TFolder,
	normalizePath,
	setIcon,
} from "obsidian";
import type VaultSpotlightPlugin from "../main";
import { FileSearcher } from "../search/FileSearcher";
import { HeadingSearcher } from "../search/HeadingSearcher";
import { CommandSearcher } from "../search/CommandSearcher";
import { SymbolSearcher } from "../search/SymbolSearcher";
import { EditorSearcher } from "../search/EditorSearcher";
import { detectModeFromPrefix, parseHeadingQuery } from "../core/modeTriggers.mjs";
import { fuzzyMatch, tokenizeQuery } from "../search/fuzzy";
import { SaveSearchPromptModal } from "./SaveSearchPromptModal";
import { PromptModal } from "./PromptModal";
import { getVaultFileKind } from "../search/vaultFiles";
import { activeProfile, createProfileFromSettings } from "../core/searchProfiles.mjs";
import { detectSearchIntegrations } from "../core/integrations.mjs";
import { findBacklinks, findOutlinks } from "../core/linkGraph.mjs";
import {
	MODE_ORDER,
	itemFile,
	type PaneTarget,
	type ResultItem,
	type SpotlightAction,
	type SpotlightMode,
} from "./resultTypes";
import { PreviewPane } from "./PreviewPane";
import { renderResultRow } from "./resultRow";
import * as batchOps from "./batchOps";
import { copyToClipboard, renameFile } from "./batchOps";

// Re-exported so existing importers keep working after the types moved to
// resultTypes.ts.
export { MODE_ORDER, type SpotlightMode } from "./resultTypes";

export class SpotlightModal extends Modal {
	private inputEl!: HTMLInputElement;
	private resultsEl!: HTMLDivElement;
	private preview: PreviewPane;
	private footerEl!: HTMLDivElement;
	private statusEl!: HTMLSpanElement;
	private modeBadgeEl!: HTMLSpanElement;
	private hintEl!: HTMLDivElement;
	private items: ResultItem[] = [];
	private selectedIndex = 0;
	private checkedPaths = new Set<string>();
	private searchTimer: number | null = null;
	private loadingTimer: number | null = null;
	private searchGeneration = 0;
	private isLoading = false;
	private fileSearcher: FileSearcher;
	private headingSearcher: HeadingSearcher;
	private commandSearcher: CommandSearcher;
	private symbolSearcher: SymbolSearcher;
	private editorSearcher: EditorSearcher;
	private initialQuery: string;
	private mode: SpotlightMode;
	private metadataRef: EventRef | null = null;
	private actionContext: ResultItem | null = null;
	private actionReturnQuery = "";
	private actionReturnMode: SpotlightMode = "files";
	private resultSnapshot: ResultItem[] = [];
	// Drill-in: arrow onto a result, then type the symbols/links trigger to
	// explore that file without opening it. Escape restores the outer search.
	private drillFile: TFile | null = null;
	private drillReturnQuery = "";
	private drillReturnMode: SpotlightMode = "files";
	private hasNavigated = false;

	constructor(
		app: App,
		private plugin: VaultSpotlightPlugin,
		initialQuery = "",
		initialMode: SpotlightMode = "files"
	) {
		super(app);
		this.shouldRestoreSelection = false;
		this.preview = new PreviewPane(app);
		this.fileSearcher = new FileSearcher(app);
		this.headingSearcher = new HeadingSearcher(app);
		this.commandSearcher = new CommandSearcher(app);
		this.symbolSearcher = new SymbolSearcher(app);
		this.editorSearcher = new EditorSearcher(app);
		this.initialQuery = initialQuery;
		this.mode = initialMode;
	}

	onOpen(): void {
		this.containerEl.addClass("vault-spotlight-container");
		this.titleEl.empty();
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("vault-spotlight-modal");

		const header = contentEl.createDiv({ cls: "vault-spotlight-header" });
		const titleRow = header.createDiv({ cls: "vault-spotlight-title-row" });
		titleRow.createDiv({ cls: "vault-spotlight-title", text: "Vault Spotlight" });
		this.modeBadgeEl = titleRow.createSpan({ cls: "vault-spotlight-mode-badge", text: "Files" });

		const inputWrap = header.createDiv({ cls: "vault-spotlight-input-wrap" });
		const searchIcon = inputWrap.createSpan({ cls: "vault-spotlight-search-icon" });
		setIcon(searchIcon, "search");

		this.inputEl = inputWrap.createEl("input", {
			type: "text",
			placeholder: "Search notes, tags, or properties…",
			attr: {
				spellcheck: "false",
				autocomplete: "off",
				autofocus: "true",
				role: "combobox",
				"aria-expanded": "true",
				"aria-autocomplete": "list",
				"aria-controls": "vault-spotlight-listbox",
				"aria-label": "Vault Spotlight search",
			},
		});
		this.inputEl.value = this.initialQuery;

		this.hintEl = header.createDiv({ cls: "vault-spotlight-hint" });
		this.updateHint();

		const body = contentEl.createDiv({ cls: "vault-spotlight-body" });
		this.resultsEl = body.createDiv({
			cls: "vault-spotlight-results",
			attr: { role: "listbox", id: "vault-spotlight-listbox", "aria-label": "Search results" },
		});
		this.renderLoading();

		if (this.previewEnabled()) {
			this.preview.mount(body);
			this.containerEl.addClass("has-preview");
		}

		this.footerEl = contentEl.createDiv({ cls: "vault-spotlight-footer" });
		this.renderFooter();

		if (!this.plugin.settings.isPro) {
			const cta = contentEl.createDiv({ cls: "vault-spotlight-pro-cta" });
			cta.createDiv({
				cls: "vault-spotlight-pro-cta-text",
				text: "Unlock ripgrep search, starred pins, canvas/PDF, batch open, and more.",
			});
			const link = cta.createEl("a", {
				cls: "vault-spotlight-pro-btn",
				text: "Get Pro on Buy Me a Coffee",
				href: this.plugin.settings.purchaseUrl,
			});
			link.setAttr("target", "_blank");
		}

		this.inputEl.addEventListener("input", () => {
			this.hasNavigated = false;
			this.scheduleSearch();
		});

		// Drill-in: after arrowing onto a result, the symbols/links trigger key
		// explores that result (QS++-style) instead of typing into the query.
		this.inputEl.addEventListener("keydown", (evt) => {
			if (!this.hasNavigated || evt.ctrlKey || evt.metaKey || evt.altKey) return;
			const prefixes = this.plugin.settings.modePrefixes;
			// Compare against the first character: prefixes may be up to 4 chars
			// (e.g. "$$") but a keydown only ever delivers one.
			const drillMode =
				evt.key === prefixes.symbols[0] ? "symbols" : evt.key === prefixes.links[0] ? "links" : null;
			if (!drillMode) return;
			const item = this.items[this.selectedIndex];
			const file = item ? itemFile(item) : null;
			if (!file || file.extension !== "md") return;
			evt.preventDefault();
			this.drillInto(file, drillMode);
		});

		this.registerScopeShortcuts();

		// Modal is not a Component, so it has no registerEvent(); track the ref
		// ourselves and release it in onClose().
		this.metadataRef = this.app.metadataCache.on("resolved", () => {
			if (this.hasMetadataFilters()) this.scheduleSearch();
		});

		this.focusInput();
		void this.runSearch().then(() => this.focusInput());
	}

	onClose(): void {
		if (this.metadataRef) {
			this.app.metadataCache.offref(this.metadataRef);
			this.metadataRef = null;
		}
		this.searchGeneration++;
		if (this.searchTimer !== null) {
			window.clearTimeout(this.searchTimer);
			this.searchTimer = null;
		}
		if (this.loadingTimer !== null) {
			window.clearTimeout(this.loadingTimer);
			this.loadingTimer = null;
		}
		this.preview.unload();
		this.plugin.onSpotlightClosed(this);
		this.containerEl.removeClass("vault-spotlight-container");
		this.containerEl.removeClass("has-preview");
		this.contentEl.empty();
	}

	private previewEnabled(): boolean {
		const profile = this.currentProfile();
		return this.plugin.settings.isPro && (profile?.showPreview ?? this.plugin.settings.showPreview);
	}

	private currentProfile(): any | null {
		if (!this.plugin.settings.isPro) return null;
		return activeProfile(this.plugin.settings.searchProfiles, this.plugin.settings.activeProfileId);
	}

	/**
	 * Trigger cheatsheet: every mode prefix stays visible in the modal so the
	 * mode system is discoverable without reading docs (the top complaint
	 * about comparable switcher plugins).
	 */
	private updateHint(): void {
		const isPro = this.plugin.settings.isPro;
		const prefixes = this.plugin.settings.modePrefixes;
		this.hintEl.empty();
		const hints: Array<[string, string]> = [
			["#journal", "tag"],
			[prefixes.commands, "commands"],
			[prefixes.symbols, "outline"],
			[prefixes.editors, "tabs"],
			[prefixes.folders, "folders"],
			[prefixes.content, "content"],
			[prefixes.headings, "headings"],
			[prefixes.links, "links"],
			["Tab", "cycle"],
			[this.plugin.settings.escapeChar, "literal"],
		];
		hints.forEach(([code, label], index) => {
			if (index > 0) this.hintEl.appendText(" · ");
			this.hintEl.createEl("code", { text: code });
			this.hintEl.appendText(` ${label}`);
		});
		if (isPro) {
			this.hintEl.appendText(" · ");
			this.hintEl.createEl("code", { text: "Ctrl+D" });
			this.hintEl.appendText(" star");
		}
	}

	private hasMetadataFilters(): boolean {
		const parsed = tokenizeQuery(this.inputEl?.value ?? "");
		return parsed.tags.length > 0 || parsed.properties.length > 0;
	}

	private expandAliases(raw: string): string {
		if (!this.plugin.settings.isPro || !this.plugin.settings.searchAliases.trim()) return raw;
		const parts = raw.trim().split(/\s+/);
		if (parts.length === 0) return raw;
		const first = parts[0].toLowerCase();
		for (const line of this.plugin.settings.searchAliases.split("\n")) {
			const match = line.match(/^\s*([^=]+?)\s*=\s*(.+)$/);
			if (!match) continue;
			if (match[1].trim().toLowerCase() === first) return [match[2].trim(), ...parts.slice(1)].join(" ");
		}
		return raw;
	}

	private scheduleSearch(): void {
		if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
		this.searchTimer = window.setTimeout(() => void this.runSearch(), 60);
	}

	/**
	 * Leading prefixes always win over the Tab-toggled mode, so they stay
	 * discoverable (all customizable): ">" content, ":" commands, "^" headings,
	 * "$" symbols, "~" links, "=" editors, "/" folders. The escape character
	 * ("!") forces a literal files search.
	 */
	private resolveQuery(raw: string): { mode: SpotlightMode; body: string } {
		const detected = detectModeFromPrefix(
			raw,
			this.plugin.settings.modePrefixes,
			this.plugin.settings.escapeChar
		);
		if (detected.escaped) return { mode: "files", body: detected.body };
		if (detected.mode) return { mode: detected.mode as SpotlightMode, body: detected.body };
		return { mode: this.mode, body: raw.trim() };
	}

	private async runSearch(): Promise<void> {
		const generation = ++this.searchGeneration;
		const raw = this.expandAliases(this.inputEl.value);
		const trimmed = raw.trim();
		const { mode, body } = this.resolveQuery(raw);
		const isEmptyQuery = body.length === 0;
		const isPro = this.plugin.settings.isPro;
		const profile = this.currentProfile();
		const excludeFolders = profile?.excludeFolders ?? this.plugin.settings.excludeFolders;
		const includeCanvas = profile?.includeCanvas ?? this.plugin.settings.includeCanvas;
		const includePdf = profile?.includePdf ?? this.plugin.settings.includePdf;
		const includeBases = profile?.includeBases ?? this.plugin.settings.includeBases;

		this.isLoading = true;
		// Only show the skeleton when a search is genuinely slow — instant
		// results (the common case) render directly, without a flash.
		if (this.loadingTimer !== null) window.clearTimeout(this.loadingTimer);
		this.loadingTimer = window.setTimeout(() => {
			this.loadingTimer = null;
			if (this.isLoading) this.renderLoading();
		}, 100);

		if (this.actionContext) {
			const actions = this.availableActions(this.actionContext);
			const query = trimmed.toLowerCase();
			this.setBadge("Actions", "is-content");
			this.items = actions
				.filter((action) => !query || `${action.name} ${action.description}`.toLowerCase().includes(query))
				.map((action) => ({ kind: "action" as const, action }));
			this.isLoading = false;
			this.selectedIndex = 0;
			this.renderResults();
			this.updateStatus(this.items.length);
			return;
		}

		try {
			if ((mode === "content" || mode === "headings" || mode === "links") && !isPro) {
				this.setBadge("Pro", "is-pro");
				this.items = [];
				this.isLoading = false;
				this.renderEmptyState(
					"lock",
					mode === "content" ? "Content search is a Pro feature" : mode === "headings" ? "Heading jump is a Pro feature" : "Links mode is a Pro feature",
					mode === "content"
						? "Search inside note bodies with queries like > meeting notes."
						: mode === "headings"
							? "Jump straight to any heading across your vault."
							: "Browse backlinks and outlinks for the active note or a matching note."
				);
				this.updateStatus(0);
				return;
			}

			if (mode === "commands") {
				const cmdQuery = body;
				this.setBadge("Commands", "is-content");
				// Empty query: resurface recently-run commands first, then the rest.
				const commandResults = this.commandSearcher.search(cmdQuery, cmdQuery ? 60 : 1000);
				if (generation !== this.searchGeneration) return;
				let ordered = commandResults;
				const recentIds = this.plugin.settings.recentCommandIds;
				if (cmdQuery.length === 0 && recentIds.length > 0) {
					const byId = new Map(commandResults.map((r) => [r.id, r]));
					const recent = recentIds
						.map((id) => byId.get(id))
						.filter((r): r is (typeof commandResults)[number] => !!r);
					const recentSet = new Set(recent.map((r) => r.id));
					ordered = [...recent, ...commandResults.filter((r) => !recentSet.has(r.id))];
				}
				const recentSet = new Set(cmdQuery.length === 0 ? recentIds : []);
				this.items = ordered.slice(0, 60).map((r) => ({
					kind: "command" as const,
					id: r.id,
					name: r.name,
					matchIndices: r.matchIndices,
					isRecent: recentSet.has(r.id),
				}));
			} else if (mode === "content") {
				const text = body;
				this.setBadge("Content", "is-content");
				// On an empty content query, surface recent searches to re-run
				// instead of an empty pane (mirrors the Recent files browse view).
				if (text.length === 0) {
					const history = this.plugin.settings.recentSearches ?? [];
					this.items = history.map((q) => ({ kind: "history" as const, query: q }));
					if (generation !== this.searchGeneration) return;
					this.isLoading = false;
					this.selectedIndex = 0;
					if (this.items.length === 0) {
						this.renderEmptyState(
							"text",
							"Search file contents",
							"Type to search inside your notes. Recent searches will appear here."
						);
						this.updateStatus(0);
					} else {
						this.renderResults();
						this.updateStatus(this.items.length);
						this.updatePreview();
					}
					return;
				}
				const contentResults = await this.plugin.contentSearcher.search(text, {
					useRipgrep: isPro,
					includeCanvas: isPro && includeCanvas,
					includeBases: isPro && includeBases,
					excludeFolders,
				});
				if (generation !== this.searchGeneration) return;
				this.items = contentResults.map((r) => ({
					kind: "content" as const,
					file: r.file,
					line: r.line,
					snippet: r.snippet,
					score: r.score,
					engine: r.engine,
				}));
			} else if (mode === "headings") {
				this.setBadge("Headings", "is-content");
				// Supports `file#heading` scoping and `level:1-2` depth filters.
				const parsed = parseHeadingQuery(body);
				const headingResults = this.headingSearcher.search(parsed.headingQuery, {
					excludeFolders,
					limit: 60,
					fileQuery: parsed.fileQuery,
					levelMin: parsed.levelMin,
					levelMax: parsed.levelMax,
				});
				if (generation !== this.searchGeneration) return;
				this.items = headingResults.map((r) => ({
					kind: "heading" as const,
					file: r.file,
					line: r.line,
					heading: r.heading,
					level: r.level,
					score: r.score,
					matchIndices: r.matchIndices,
				}));
			} else if (mode === "symbols") {
				const target = this.drillFile ?? this.app.workspace.getActiveFile();
				this.setBadge(target ? `Symbols · ${target.basename}` : "Symbols", "is-content");
				if (!target || target.extension !== "md") {
					this.items = [];
					this.isLoading = false;
					this.renderEmptyState(
						"heading",
						"No note to outline",
						"Open a Markdown note, or arrow onto a file result and press the symbols trigger."
					);
					this.updateStatus(0);
					return;
				}
				const symbolResults = this.symbolSearcher.search(target, body, 100);
				if (generation !== this.searchGeneration) return;
				this.items = symbolResults.map((r) => ({
					kind: "symbol" as const,
					file: r.file,
					line: r.line,
					text: r.text,
					symbolType: r.symbolType,
					level: r.level,
					matchIndices: r.matchIndices,
				}));
			} else if (mode === "editors") {
				this.setBadge("Editors", "is-content");
				const editorResults = this.editorSearcher.search(body, 60);
				if (generation !== this.searchGeneration) return;
				this.items = editorResults.map((r) => ({
					kind: "editor" as const,
					leaf: r.leaf,
					file: r.file,
					title: r.title,
					viewType: r.viewType,
					isActive: r.isActive,
					isPinned: r.isPinned,
					matchIndices: r.matchIndices,
				}));
				if (this.items.length === 0) {
					this.isLoading = false;
					this.renderEmptyState("layout", "No open editors", "Open a few notes, then jump between their tabs from here.");
					this.updateStatus(0);
					return;
				}
			} else if (mode === "folders") {
				this.setBadge("Folders", "is-content");
				this.items = this.folderItems(body);
				if (this.items.length === 0) {
					this.isLoading = false;
					this.renderEmptyState("folder", "No matching folders", "Press Enter on a folder to browse its files.");
					this.updateStatus(0);
					return;
				}
			} else if (mode === "links") {
				const linkTarget = this.drillFile ?? this.app.workspace.getActiveFile();
				this.setBadge(linkTarget && !body ? `Links · ${linkTarget.basename}` : "Links", "is-content");
				this.items = this.linkModeItems(body);
				if (this.items.length === 0) {
					this.isLoading = false;
					this.renderEmptyState("link", "No linked notes found", "Use Links mode on an active note, or type a note name to inspect backlinks.");
					this.updateStatus(0);
					return;
				}
			} else {
				this.setBadge(isEmptyQuery ? "Browse" : "Files", null);
				const parsed = tokenizeQuery(body);
				const fileResults = await this.fileSearcher.search({
					textTokens: parsed.textTokens,
					phrases: isPro ? parsed.phrases : [],
					exclusions: isPro ? parsed.exclusions : [],
					// in: stays free — folder mode's Enter-to-browse depends on it.
					folderIncludes: parsed.folderIncludes,
					pathTerms: isPro ? parsed.pathTerms : [],
					nameTerms: isPro ? parsed.nameTerms : [],
					tags: parsed.tags,
					properties: parsed.properties,
					extFilters: isPro ? parsed.extFilters : [],
					isStarred: isPro ? parsed.isStarred : false,
					isBookmarked: isPro ? parsed.isBookmarked : false,
					modifiedDays: isPro ? parsed.modifiedDays : null,
					createdDays: isPro ? parsed.createdDays : null,
					recentPaths: this.plugin.settings.recentPaths,
					starredPaths: isPro ? this.plugin.settings.starredPaths : [],
					bookmarkedPaths: this.plugin.getBookmarkedPaths(),
					openPaths: this.editorSearcher.openFilePaths(),
					includeCanvas: isPro && includeCanvas,
					includePdf: isPro && includePdf,
					includeBases: isPro && includeBases,
					excludeFolders,
					frecency: this.plugin.settings.useFrecency ? this.plugin.settings.fileFrecency : undefined,
					limit: isEmptyQuery ? 40 : 50,
				});
				if (generation !== this.searchGeneration) return;
				this.items = fileResults.map((r) => ({
					kind: "file" as const,
					file: r.file,
					score: r.score,
					matchIndices: r.matchIndices,
					modifiedLabel: r.modifiedLabel,
					fileKind: r.fileKind,
					isRecent: r.isRecent,
					isStarred: r.isStarred,
					isBookmarked: r.isBookmarked,
				}));

				if (isEmptyQuery && isPro && this.plugin.settings.searchProfiles.length > 0) {
					const profiles = this.plugin.settings.searchProfiles.map((searchProfile) => ({
						kind: "profile" as const,
						id: searchProfile.id,
						name: searchProfile.name,
						defaultMode: searchProfile.defaultMode,
						defaultQuery: searchProfile.defaultQuery,
						isActive: searchProfile.id === this.plugin.settings.activeProfileId,
					}));
					this.items = [...profiles, ...this.items];
				}

				if (isEmptyQuery && isPro && this.plugin.settings.customSearches.length > 0) {
					const pinned = new Set(this.plugin.settings.pinnedCustomSearchIds);
					const collections = this.plugin.settings.customSearches
						.slice()
						.sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)) || a.name.localeCompare(b.name))
						.map((search) => ({
							kind: "collection" as const,
							id: search.id,
							name: search.name,
							query: search.query,
							isPinned: pinned.has(search.id),
						}));
					this.items = [...collections, ...this.items];
				}

				// Offer to create a note when a plain name search finds nothing.
				const noFilters =
					parsed.tags.length === 0 &&
					parsed.properties.length === 0 &&
					parsed.extFilters.length === 0 &&
					parsed.phrases.length === 0 &&
					parsed.exclusions.length === 0 &&
					parsed.folderIncludes.length === 0 &&
					parsed.pathTerms.length === 0 &&
					parsed.nameTerms.length === 0 &&
					!parsed.isStarred &&
					!parsed.isBookmarked &&
					parsed.modifiedDays === null &&
					parsed.createdDays === null;
				if (this.items.length === 0 && !isEmptyQuery && noFilters) {
					this.items = [{ kind: "create", name: body }];
				}
			}
		} catch (err) {
			if (generation !== this.searchGeneration) return;
			console.error("[VaultSpotlight] search failed", err);
			this.items = [];
			this.isLoading = false;
			this.renderEmptyState("alert-triangle", "Search failed", "Something went wrong. Try a different query.");
			this.updateStatus(0);
			return;
		}

		this.isLoading = false;
		this.selectedIndex = 0;
		this.renderResults();
		this.updateStatus(this.items.length);
		this.updatePreview();
	}

	private setBadge(text: string, cls: "is-content" | "is-pro" | null): void {
		this.modeBadgeEl.setText(text);
		this.modeBadgeEl.removeClass("is-content");
		this.modeBadgeEl.removeClass("is-pro");
		if (cls) this.modeBadgeEl.addClass(cls);
	}

	private getBrowseSection(item: ResultItem): string | null {
		if (item.kind === "profile" && this.inputEl.value.trim().length === 0) return "Search profiles";
		if (item.kind === "collection" && this.inputEl.value.trim().length === 0) return "Smart collections";
		if (item.kind !== "file" || this.inputEl.value.trim().length > 0) return null;
		if (item.isStarred) return "Starred";
		if (item.isBookmarked) return "Bookmarks";
		if (item.isRecent) return "Recent";
		return "All notes";
	}

	private fileToResult(file: TFile, score: number, bookmarkedPaths: Set<string>): ResultItem {
		return {
			kind: "file",
			file,
			score,
			matchIndices: [],
			modifiedLabel: "",
			fileKind: getVaultFileKind(file),
			isRecent: this.plugin.settings.recentPaths.includes(file.path),
			isStarred: this.plugin.isStarred(file.path),
			isBookmarked: bookmarkedPaths.has(file.path),
		};
	}

	private linkModeItems(query: string): ResultItem[] {
		const active = this.app.workspace.getActiveFile();
		const files = this.app.vault.getMarkdownFiles();
		const q = query.replace(/^(<-|->|\[\[)\s?/, "").trim().toLowerCase();
		// Drilled-in file wins; otherwise the best-matching typed name,
		// otherwise the active note.
		const target = this.drillFile ?? (q ? this.bestFileMatch(files, q) : active);
		if (!target) return [];
		const resolvedLinks = this.app.metadataCache.resolvedLinks ?? {};
		let linked = query.trim().startsWith("->")
			? findOutlinks(files, resolvedLinks, target.path)
			: findBacklinks(files, resolvedLinks, target.path);
		// When drilled in, the query text filters the linked notes themselves
		// (the target is already fixed) instead of being ignored.
		if (this.drillFile && q) {
			linked = linked.filter((file) => fuzzyMatch(q, file.basename) ?? fuzzyMatch(q, file.path));
		}
		// Walk the bookmark tree once for the whole result set, not per row.
		const bookmarkedPaths = new Set(this.plugin.getBookmarkedPaths());
		return linked.slice(0, 60).map((file, index) => this.fileToResult(file, 1000 - index, bookmarkedPaths));
	}

	/** The highest-scoring fuzzy match for `q`, not just the first substring hit. */
	private bestFileMatch(files: TFile[], q: string): TFile | null {
		let best: TFile | null = null;
		let bestScore = -1;
		for (const file of files) {
			const match = fuzzyMatch(q, file.basename) ?? fuzzyMatch(q, file.path);
			if (match && match.score > bestScore) {
				best = file;
				bestScore = match.score;
			}
		}
		return best;
	}

	private folderItems(query: string): ResultItem[] {
		const q = query.trim();
		const rows: Array<{ folder: TFolder; score: number; indices: number[] }> = [];
		for (const abstract of this.app.vault.getAllLoadedFiles()) {
			if (!(abstract instanceof TFolder) || abstract.isRoot()) continue;
			if (q.length === 0) {
				rows.push({ folder: abstract, score: 1, indices: [] });
				continue;
			}
			const nameMatch = fuzzyMatch(q, abstract.name);
			const match = nameMatch ?? fuzzyMatch(q, abstract.path);
			if (!match) continue;
			rows.push({
				folder: abstract,
				// Prefer name hits; path-only hits rank at a discount and get no
				// highlight (indices would point into the path, not the name).
				score: nameMatch ? match.score + 10 : Math.floor(match.score / 2),
				indices: nameMatch ? match.indices : [],
			});
		}
		rows.sort((a, b) => b.score - a.score || a.folder.path.localeCompare(b.folder.path));
		return rows.slice(0, 60).map((row) => ({
			kind: "folder" as const,
			folder: row.folder,
			matchIndices: row.indices,
		}));
	}

	private renderLoading(): void {
		this.resultsEl.empty();
		this.resultsEl.addClass("vault-spotlight-loading");
		for (let i = 0; i < 5; i++) {
			this.resultsEl.createDiv({ cls: "vault-spotlight-skeleton" });
		}
	}

	private renderEmptyState(icon: string, title: string, desc: string): void {
		if (this.loadingTimer !== null) {
			window.clearTimeout(this.loadingTimer);
			this.loadingTimer = null;
		}
		this.resultsEl.empty();
		this.resultsEl.removeClass("vault-spotlight-loading");
		const empty = this.resultsEl.createDiv({ cls: "vault-spotlight-empty" });
		const iconWrap = empty.createDiv({ cls: "vault-spotlight-empty-icon" });
		setIcon(iconWrap, icon);
		empty.createDiv({ cls: "vault-spotlight-empty-title", text: title });
		empty.createDiv({ cls: "vault-spotlight-empty-desc", text: desc });
	}

	private renderResults(): void {
		if (this.loadingTimer !== null) {
			window.clearTimeout(this.loadingTimer);
			this.loadingTimer = null;
		}
		this.resultsEl.empty();
		this.resultsEl.removeClass("vault-spotlight-loading");

		if (this.items.length === 0) {
			if (this.inputEl.value.trim().length === 0) {
				this.renderEmptyState(
					"files",
					"No notes in this vault yet",
					"Create a note and it will show up here instantly."
				);
			} else {
				this.renderEmptyState(
					"search",
					"No matches found",
					"Try a shorter query, fewer filters, or check your spelling."
				);
			}
			return;
		}

		const isEmptyQuery = this.inputEl.value.trim().length === 0;
		let lastSection = "";

		this.items.forEach((item, index) => {
			const section = this.getBrowseSection(item);
			if (section && section !== lastSection) {
				this.resultsEl.createDiv({ cls: "vault-spotlight-section-label", text: section });
				lastSection = section;
			}

			const row = this.resultsEl.createDiv({
				cls: "vault-spotlight-item",
				attr: { role: "option", id: `vault-spotlight-opt-${index}` },
			});
			row.dataset.index = String(index);
			this.applyRowState(row, index);

			const file = itemFile(item);

			if (this.plugin.settings.isPro && file) {
				const check = row.createDiv({ cls: "vault-spotlight-check" });
				if (this.checkedPaths.has(file.path)) {
					setIcon(check, "check");
				}
			}

			renderResultRow(row, item, {
				isEmptyQuery,
				showModifiedTime: this.plugin.settings.showModifiedTime,
			});

			if (this.plugin.settings.isPro && item.kind === "file") {
				const starBtn = row.createDiv({ cls: "vault-spotlight-star-btn" });
				setIcon(starBtn, item.isStarred ? "star" : "star-off");
				starBtn.setAttr("aria-label", item.isStarred ? "Unstar" : "Star");
				starBtn.addEventListener("mousedown", (evt) => {
					evt.preventDefault();
					evt.stopPropagation();
					this.plugin.toggleStar(item.file.path);
					void this.runSearch();
				});
			}

			row.addEventListener("mouseenter", () => {
				this.selectedIndex = index;
				this.updateSelectionHighlight();
			});
			row.addEventListener("mousedown", (evt) => {
				if ((evt.target as HTMLElement).closest(".vault-spotlight-star-btn")) return;
				evt.preventDefault();
				this.selectedIndex = index;
				void this.activateSelection();
			});
			if (file) {
				row.addEventListener("contextmenu", (evt) => {
					evt.preventDefault();
					this.selectedIndex = index;
					this.updateSelectionHighlight();
					this.openActionsMenu(item, evt);
				});
			}
		});
	}

	private applyRowState(row: HTMLElement, index: number): void {
		const selected = index === this.selectedIndex;
		row.toggleClass("is-selected", selected);
		row.setAttribute("aria-selected", String(selected));
		const item = this.items[index];
		const file = item ? itemFile(item) : null;
		if (file) {
			row.toggleClass("is-checked", this.checkedPaths.has(file.path));
		}
	}

	private updateSelectionHighlight(): void {
		const rows = this.resultsEl.querySelectorAll<HTMLElement>(".vault-spotlight-item");
		rows.forEach((row) => {
			const index = Number(row.dataset.index);
			this.applyRowState(row, index);
		});
		const selected = this.resultsEl.querySelector<HTMLElement>(".is-selected");
		selected?.scrollIntoView({ block: "nearest" });
		// Point the combobox at the active option for screen readers.
		if (selected?.id) this.inputEl.setAttribute("aria-activedescendant", selected.id);
		else this.inputEl.removeAttribute("aria-activedescendant");
		this.updatePreview();
	}

	private renderFooter(): void {
		this.footerEl.empty();
		const shortcuts = this.footerEl.createDiv({ cls: "vault-spotlight-shortcuts" });

		this.addShortcut(shortcuts, ["↑", "↓"], "navigate");
		this.addShortcut(shortcuts, ["↵"], "open");
		this.addShortcut(shortcuts, ["Ctrl", "↵"], this.plugin.settings.defaultNewTab ? "same tab" : "new tab");
		this.addShortcut(shortcuts, ["Shift", "↵"], "new note");
		this.addShortcut(shortcuts, ["Alt", "↵"], "menu");
		this.addShortcut(shortcuts, ["Tab"], "mode");
		this.addShortcut(shortcuts, ["Ctrl", "K"], "actions");

		if (this.plugin.settings.isPro) {
			this.addShortcut(shortcuts, ["Ctrl", "D"], "star");
			this.addShortcut(shortcuts, ["Ctrl", "Space"], "select");
		}

		this.statusEl = this.footerEl.createSpan({ cls: "vault-spotlight-status" });
	}

	private addShortcut(container: HTMLElement, keys: string[], label: string): void {
		const wrap = container.createSpan({ cls: "vault-spotlight-shortcut" });
		for (const key of keys) {
			wrap.createEl("kbd", { text: key });
		}
		wrap.appendText(` ${label}`);
	}

	private updateStatus(count: number): void {
		if (!this.statusEl) return;
		if (this.checkedPaths.size > 0) {
			this.statusEl.setText(`${this.checkedPaths.size} selected`);
			return;
		}
		if (count === 0) {
			this.statusEl.setText("");
			return;
		}
		this.statusEl.setText(`${count} result${count === 1 ? "" : "s"}`);
	}

	private moveSelection(delta: number): void {
		if (this.items.length === 0 || this.isLoading) return;
		this.selectedIndex = (this.selectedIndex + delta + this.items.length) % this.items.length;
		// Arrowing onto a result arms drill-in: the next symbols/links trigger
		// keypress explores that result instead of typing into the query.
		this.hasNavigated = true;
		this.updateSelectionHighlight();
	}

	/** Shift+Enter: create a note named after the current query text. */
	private async createFromQuery(): Promise<void> {
		const { body } = this.resolveQuery(this.inputEl.value);
		if (!body) return;
		this.recordSearch();
		this.close();
		await this.createAndOpen(body);
	}

	private drillInto(file: TFile, mode: SpotlightMode): void {
		this.drillReturnQuery = this.inputEl.value;
		this.drillReturnMode = this.mode;
		this.drillFile = file;
		this.mode = mode;
		this.inputEl.value = "";
		this.hasNavigated = false;
		this.focusInput();
		void this.runSearch();
	}

	private exitDrill(): void {
		if (!this.drillFile) return;
		this.drillFile = null;
		this.mode = this.drillReturnMode;
		this.inputEl.value = this.drillReturnQuery;
		this.hasNavigated = false;
		this.focusInput();
		void this.runSearch();
	}

	private toggleCheck(): void {
		const item = this.items[this.selectedIndex];
		const file = item ? itemFile(item) : null;
		if (!file) return;
		if (this.checkedPaths.has(file.path)) {
			this.checkedPaths.delete(file.path);
		} else {
			this.checkedPaths.add(file.path);
		}
		this.updateSelectionHighlight();
		this.updateStatus(this.items.length);
	}

	private toggleStarSelected(): void {
		const item = this.items[this.selectedIndex];
		if (!item || item.kind !== "file") return;
		this.plugin.toggleStar(item.file.path);
		void this.runSearch();
	}

	private cycleMode(): void {
		const idx = MODE_ORDER.indexOf(this.mode);
		this.mode = MODE_ORDER[(idx + 1) % MODE_ORDER.length];
		// Drop a leading mode prefix so the toggled mode isn't overridden by it.
		const detected = detectModeFromPrefix(
			this.inputEl.value,
			this.plugin.settings.modePrefixes,
			this.plugin.settings.escapeChar
		);
		if (detected.mode) this.inputEl.value = detected.body;
		this.focusInput();
		void this.runSearch();
	}

	private async activateSelection(paneOverride: PaneTarget = null): Promise<void> {
		const selected = this.items[this.selectedIndex];
		if (!selected) return;

		if (selected.kind === "editor") {
			this.recordSearch();
			this.close();
			this.editorSearcher.activate(selected.leaf);
			if (selected.file) this.plugin.trackRecent(selected.file.path);
			return;
		}

		if (selected.kind === "folder") {
			// Browse the folder's files without leaving Spotlight.
			this.drillFile = null;
			this.mode = "files";
			this.inputEl.value = `in:"${selected.folder.path}" `;
			this.focusInput();
			void this.runSearch();
			return;
		}

		if (selected.kind === "history") {
			// Re-run a past search without leaving the modal.
			this.inputEl.value = selected.query;
			this.focusInput();
			void this.runSearch();
			return;
		}

		if (selected.kind === "collection") {
			this.inputEl.value = selected.query;
			this.actionContext = null;
			this.mode = "files";
			this.focusInput();
			void this.runSearch();
			return;
		}

		if (selected.kind === "profile") {
			this.activateProfile(selected.id);
			return;
		}

		if (selected.kind === "action") {
			if (selected.action.requiresPro && !this.plugin.settings.isPro) {
				new Notice("Vault Spotlight: Pro required for this action.");
				return;
			}
			await selected.action.run();
			return;
		}

		if (selected.kind === "command") {
			this.close();
			if (this.commandSearcher.execute(selected.id)) this.plugin.trackCommand(selected.id);
			return;
		}

		if (selected.kind === "create") {
			this.recordSearch();
			this.close();
			await this.createAndOpen(selected.name);
			return;
		}

		// Opening a real result means the current query was useful — remember it.
		this.recordSearch();

		const targets =
			this.checkedPaths.size > 0
				? this.items.filter((i) => {
						const f = itemFile(i);
						return f ? this.checkedPaths.has(f.path) : false;
				  })
				: [selected];

		if (targets.length === 0) return;

		this.checkedPaths.clear();
		this.close();

		// Batch-open always uses tabs; a single open honors the override, then
		// the "open in new tab by default" setting.
		const defaultTarget: PaneTarget = this.plugin.settings.defaultNewTab ? "tab" : null;
		const target: PaneTarget = targets.length > 1 ? "tab" : paneOverride ?? defaultTarget;

		for (const item of targets) {
			const file = itemFile(item);
			if (!file) continue;
			try {
				await this.openItem(item, target);
				this.plugin.trackRecent(file.path);
			} catch (err) {
				console.error("[VaultSpotlight] failed to open", file.path, err);
			}
		}
	}

	private async openItem(item: ResultItem, target: PaneTarget): Promise<void> {
		const file = itemFile(item);
		if (!file) return;
		const leaf = target === null ? this.app.workspace.getLeaf(false) : this.app.workspace.getLeaf(target);
		await leaf.openFile(file);
		const line = item.kind === "content" || item.kind === "heading" || item.kind === "symbol" ? item.line : null;
		if (line !== null && file.extension === "md" && leaf.view instanceof MarkdownView) {
			const editor = leaf.view.editor;
			editor.setCursor({ line: line - 1, ch: 0 });
			editor.scrollIntoView({ from: { line: line - 1, ch: 0 }, to: { line: line - 1, ch: 0 } }, true);
		}
	}

	private async createAndOpen(rawName: string): Promise<void> {
		try {
			const cleaned = rawName.replace(/[\\/:*?"<>|]/g, "").trim() || "Untitled";
			const parent = this.app.fileManager.getNewFileParent(
				this.app.workspace.getActiveFile()?.path ?? ""
			);
			const dir = parent.path ? `${parent.path}/` : "";
			const path = normalizePath(`${dir}${cleaned}.md`);
			const existing = this.app.vault.getAbstractFileByPath(path);
			const file = existing instanceof TFile ? existing : await this.app.vault.create(path, "");
			await this.app.workspace.getLeaf(false).openFile(file);
			this.plugin.trackRecent(file.path);
		} catch (err) {
			console.error("[VaultSpotlight] create note failed", err);
			new Notice("Vault Spotlight: could not create note.");
		}
	}

	private openActionPalette(context: ResultItem | null = this.items[this.selectedIndex] ?? null): void {
		if (!context || context.kind === "action" || context.kind === "history" || context.kind === "create") return;
		this.actionContext = context;
		this.actionReturnQuery = this.inputEl.value;
		this.actionReturnMode = this.mode;
		this.resultSnapshot = this.items;
		this.inputEl.value = "";
		this.focusInput();
		void this.runSearch();
	}

	private closeActionPalette(): void {
		if (!this.actionContext) return;
		this.actionContext = null;
		this.inputEl.value = this.actionReturnQuery;
		this.mode = this.actionReturnMode;
		this.focusInput();
		void this.runSearch();
	}

	private activateProfile(id: string): void {
		const profile = activeProfile(this.plugin.settings.searchProfiles, id);
		if (!profile) return;
		this.plugin.settings.activeProfileId = profile.id;
		void this.plugin.saveSettings();
		this.actionContext = null;
		this.mode = profile.defaultMode;
		this.inputEl.value = profile.defaultQuery;
		this.focusInput();
		void this.runSearch();
	}

	private clearProfile(): void {
		this.plugin.settings.activeProfileId = "";
		void this.plugin.saveSettings();
		this.actionContext = null;
		this.inputEl.value = "";
		this.mode = "files";
		void this.runSearch();
	}

	private saveCurrentProfile(): void {
		new PromptModal(this.app, {
			title: "Save search profile",
			initial: "New profile",
			cta: "Save profile",
			onSubmit: (name) => {
				const profile = createProfileFromSettings(name, this.plugin.settings, this.actionReturnMode || this.mode, this.actionReturnQuery || this.inputEl.value);
				const exists = this.plugin.settings.searchProfiles.some((p) => p.id === profile.id);
				this.plugin.settings.searchProfiles = [
					...this.plugin.settings.searchProfiles.filter((p) => p.id !== profile.id),
					{ ...profile, id: exists ? `${profile.id}-${Date.now()}` : profile.id },
				].slice(0, 20);
				void this.plugin.saveSettings();
				new Notice("Vault Spotlight: search profile saved.");
				this.closeActionPalette();
			},
		}).open();
	}

	private installedSearchIntegrations(): { omnisearch: boolean; textExtractor: boolean } {
		const plugins = (this.app as unknown as { plugins?: { plugins?: Record<string, unknown> } }).plugins?.plugins ?? {};
		return detectSearchIntegrations(Object.keys(plugins));
	}

	private runIntegrationCommand(name: "omnisearch" | "text extractor"): void {
		const command = this.commandSearcher.search(name, 20).find((cmd) => cmd.id.toLowerCase().includes(name.replace(" ", "-")) || cmd.name.toLowerCase().includes(name));
		if (!command || !this.commandSearcher.execute(command.id)) {
			new Notice(`Vault Spotlight: ${name} command not found.`);
			return;
		}
		this.close();
	}

	private availableActions(context: ResultItem): SpotlightAction[] {
		if (context.kind === "profile") {
			return [
				{
					id: "activate-profile",
					name: "Activate search profile",
					description: `Switch to ${context.name} and run its default query.`,
					requiresPro: true,
					run: () => this.activateProfile(context.id),
				},
				{
					id: "clear-profile",
					name: "Clear active profile",
					description: "Return Spotlight to the global search settings.",
					requiresPro: true,
					run: () => this.clearProfile(),
				},
			];
		}

		if (context.kind === "collection") {
			return [
				{
					id: "run-collection",
					name: "Run smart collection",
					description: context.query,
					run: () => {
						this.actionContext = null;
						this.inputEl.value = context.query;
						void this.runSearch();
					},
				},
				{
					id: "pin-collection",
					name: context.isPinned ? "Unpin smart collection" : "Pin smart collection",
					description: "Keep this saved search at the top of the browse view.",
					requiresPro: true,
					run: () => {
						this.plugin.togglePinnedCollection(context.id);
						this.closeActionPalette();
					},
				},
				{
					id: "copy-collection-query",
					name: "Copy collection query",
					description: "Copy the saved search query to the clipboard.",
					run: () => copyToClipboard(context.query, "Query copied"),
				},
			];
		}

		const file = itemFile(context);
		const actions: SpotlightAction[] = [];
		if (file) {
			actions.push(
				{
					id: "open",
					name: "Open",
					description: "Open the selected result.",
					run: async () => {
						this.close();
						await this.openItem(context, null);
						this.plugin.trackRecent(file.path);
					},
				},
				{
					id: "copy-link",
					name: "Copy link",
					description: "Copy a Markdown link for this result.",
					run: () => copyToClipboard(this.app.fileManager.generateMarkdownLink(file, ""), "Link copied"),
				},
				{
					id: "copy-path",
					name: "Copy path",
					description: "Copy this file path.",
					run: () => copyToClipboard(file.path, "Path copied"),
				},
				{
					id: "rename",
					name: "Rename",
					description: "Rename the selected note or file.",
					requiresPro: true,
					run: () => renameFile(this.app, file),
				},
				{
					id: "toggle-star",
					name: this.plugin.isStarred(file.path) ? "Unstar" : "Star",
					description: "Toggle the selected file in Starred pins.",
					requiresPro: true,
					run: () => {
						this.plugin.toggleStar(file.path);
						this.closeActionPalette();
					},
				}
			);
		}

		actions.push(
			{
				id: "save-profile",
				name: "Save current setup as profile",
				description: "Create a Pro search profile from the current mode, query, preview, file type, and folder settings.",
				requiresPro: true,
				run: () => this.saveCurrentProfile(),
			},
			{
				id: "copy-results",
				name: "Copy results as Markdown",
				description: "Copy selected results, or the current result list, as Markdown links.",
				requiresPro: true,
				run: () => batchOps.copyResultsAsMarkdown(this.batchContext()),
			},
			{
				id: "export-results",
				name: "Export results to note",
				description: "Create a Markdown note containing selected/search results.",
				requiresPro: true,
				run: () => batchOps.exportResultsToNote(this.batchContext()),
			},
			{
				id: "batch-add-tag",
				name: "Batch add tag",
				description: "Append a tag to selected Markdown files.",
				requiresPro: true,
				run: () => batchOps.batchAddTag(this.batchContext()),
			},
			{
				id: "batch-remove-tag",
				name: "Batch remove tag",
				description: "Remove a tag from selected Markdown files.",
				requiresPro: true,
				run: () => batchOps.batchRemoveTag(this.batchContext()),
			},
			{
				id: "batch-set-property",
				name: "Batch set property",
				description: "Set a frontmatter property on selected Markdown files.",
				requiresPro: true,
				run: () => batchOps.batchSetProperty(this.batchContext()),
			},
			{
				id: "batch-move",
				name: "Batch move files",
				description: "Move selected files into a target folder.",
				requiresPro: true,
				run: () => batchOps.batchMoveFiles(this.batchContext()),
			},
			{
				id: "batch-star",
				name: "Batch star results",
				description: "Add selected/current result files to Starred pins.",
				requiresPro: true,
				run: () => batchOps.batchSetStarred(this.batchContext(), true),
			},
			{
				id: "batch-unstar",
				name: "Batch unstar results",
				description: "Remove selected/current result files from Starred pins.",
				requiresPro: true,
				run: () => batchOps.batchSetStarred(this.batchContext(), false),
			},
			{
				id: "create-moc",
				name: "Create MOC from results",
				description: "Create a grouped index note from selected/current results.",
				requiresPro: true,
				run: () => batchOps.createMocFromResults(this.batchContext()),
			},
			{
				id: "append-links",
				name: "Append links to active note",
				description: "Append selected/current result links to the active Markdown note.",
				requiresPro: true,
				run: () => batchOps.appendLinksToActiveNote(this.batchContext()),
			}
		);
		const integrations = this.installedSearchIntegrations();
		if (integrations.omnisearch) {
			actions.push({
				id: "open-omnisearch",
				name: "Search in Omnisearch",
				description: "Hand off to the installed Omnisearch plugin.",
				requiresPro: true,
				run: () => this.runIntegrationCommand("omnisearch"),
			});
		}
		if (integrations.textExtractor) {
			actions.push({
				id: "open-text-extractor",
				name: "Run Text Extractor",
				description: "Use the installed Text Extractor plugin for document/PDF text support.",
				requiresPro: true,
				run: () => this.runIntegrationCommand("text extractor"),
			});
		}
		return actions;
	}

	private resultItemsForBatch(): ResultItem[] {
		const allItems = this.actionContext ? this.resultSnapshot : this.items;
		const checked = allItems.filter((item) => {
			const file = itemFile(item);
			return file ? this.checkedPaths.has(file.path) : false;
		});
		const source = checked.length > 0 ? checked : allItems;
		return source.filter((item) => !!itemFile(item));
	}

	/**
	 * Everything the extracted batch/export operations need from the modal —
	 * see batchOps.ts, which owns the actual file-mutation logic.
	 */
	private batchContext(): batchOps.BatchOpsContext {
		return {
			app: this.app,
			plugin: this.plugin,
			resultItems: () => this.resultItemsForBatch(),
			exportQuery: () => this.actionReturnQuery || this.inputEl.value,
			close: () => this.close(),
			runSearch: () => void this.runSearch(),
			closeActionPalette: () => this.closeActionPalette(),
		};
	}

	private openActionsMenu(item: ResultItem, evt?: MouseEvent): void {
		const file = itemFile(item);
		if (!file) return;
		const line = item.kind === "content" || item.kind === "heading" ? item.line : null;
		const menu = new Menu();

		const openIn = (paneType: "tab" | "split" | "window") => {
			this.close();
			void (async () => {
				const leaf = this.app.workspace.getLeaf(paneType);
				await leaf.openFile(file);
				if (line !== null && file.extension === "md" && leaf.view instanceof MarkdownView) {
					leaf.view.editor.setCursor({ line: line - 1, ch: 0 });
				}
				this.plugin.trackRecent(file.path);
			})();
		};

		menu.addItem((i) => i.setTitle("Open in new tab").setIcon("file-plus").onClick(() => openIn("tab")));
		menu.addItem((i) =>
			i.setTitle("Open to the right").setIcon("separator-vertical").onClick(() => openIn("split"))
		);
		menu.addItem((i) =>
			i.setTitle("Open in new window").setIcon("picture-in-picture-2").onClick(() => openIn("window"))
		);
		menu.addSeparator();
		menu.addItem((i) =>
			i
				.setTitle("Copy Obsidian link")
				.setIcon("link")
				.onClick(() => {
					const link = this.app.fileManager.generateMarkdownLink(file, "");
					copyToClipboard(link, "Link copied");
				})
		);
		menu.addItem((i) =>
			i
				.setTitle("Copy path")
				.setIcon("copy")
				.onClick(() => copyToClipboard(file.path, "Path copied"))
		);
		menu.addItem((i) =>
			i
				.setTitle("Rename…")
				.setIcon("pencil")
				.onClick(() => renameFile(this.app, file))
		);

		const showInFolder = (this.app as unknown as { showInFolder?: (p: string) => void }).showInFolder;
		if (typeof showInFolder === "function") {
			menu.addItem((i) =>
				i
					.setTitle("Show in system explorer")
					.setIcon("folder-open")
					.onClick(() => showInFolder.call(this.app, file.path))
			);
		}

		if (evt) {
			menu.showAtMouseEvent(evt);
		} else {
			const rect = this.resultsEl.querySelector(".is-selected")?.getBoundingClientRect();
			if (rect) menu.showAtPosition({ x: rect.left + 40, y: rect.bottom });
			else menu.showAtPosition({ x: 100, y: 100 });
		}
	}

	private saveCustomSearch(): void {
		const query = this.inputEl.value.trim();
		if (!query) return;

		new SaveSearchPromptModal(this.app, (name) => {
			const exists = this.plugin.settings.customSearches.some(
				(s) => s.name.toLowerCase() === name.toLowerCase()
			);
			if (exists) {
				new Notice("Vault Spotlight: a saved search with that name already exists.");
				return;
			}
			const entry = {
				id: typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `cs-${Date.now()}`,
				name,
				query,
			};
			this.plugin.settings.customSearches.push(entry);
			void this.plugin.saveSettings();
			this.plugin.registerCustomSearchCommand(entry);
		}).open();
	}

	private recordSearch(): void {
		const raw = this.inputEl.value.trim();
		if (!raw) return;
		// Strip mode prefixes so history stores the plain query text.
		const { body } = this.resolveQuery(raw);
		if (body.length > 0) this.plugin.trackSearch(body);
	}

	private updatePreview(): void {
		if (!this.preview.isMounted) return;
		const item = this.items[this.selectedIndex];
		this.preview.update(item ? itemFile(item) : null, this.previewHighlightTerms(item));
	}

	/** Terms to highlight in the preview for the current selection. */
	private previewHighlightTerms(item: ResultItem | undefined): string[] {
		if (!item) return [];
		if (item.kind === "heading") return [item.heading];
		if (item.kind === "symbol" && item.symbolType === "heading") return [item.text];
		if (item.kind === "content") {
			const { body } = this.resolveQuery(this.inputEl.value);
			return body.split(/\s+/).filter(Boolean);
		}
		return [];
	}

	private registerScopeShortcuts(): void {
		// The modal's Scope is pushed onto Obsidian's keymap while the modal is
		// open, so these fire regardless of which element inside the modal holds
		// DOM focus. Typed characters are left untouched here so they flow into
		// the focused input natively.
		this.scope.register([], "ArrowDown", (evt) => {
			evt.preventDefault();
			this.moveSelection(1);
			return false;
		});
		this.scope.register([], "ArrowUp", (evt) => {
			evt.preventDefault();
			this.moveSelection(-1);
			return false;
		});
		this.scope.register([], "Enter", (evt) => {
			evt.preventDefault();
			void this.activateSelection();
			return false;
		});
		// Ctrl+Enter flips the default open target: new tab normally, current
		// tab when "open in new tab by default" is on.
		this.scope.register(["Mod"], "Enter", (evt) => {
			evt.preventDefault();
			void this.activateSelection(this.plugin.settings.defaultNewTab ? null : "tab");
			return false;
		});
		this.scope.register(["Mod", "Alt"], "Enter", (evt) => {
			evt.preventDefault();
			void this.activateSelection("split");
			return false;
		});
		this.scope.register(["Alt"], "Enter", (evt) => {
			evt.preventDefault();
			const item = this.items[this.selectedIndex];
			if (item) this.openActionsMenu(item);
			return false;
		});
		this.scope.register(["Shift"], "Enter", (evt) => {
			evt.preventDefault();
			void this.createFromQuery();
			return false;
		});
		this.scope.register(["Mod"], "k", (evt) => {
			evt.preventDefault();
			this.openActionPalette();
			return false;
		});
		this.scope.register([], "Escape", (evt) => {
			evt.preventDefault();
			if (this.actionContext) this.closeActionPalette();
			else if (this.drillFile) this.exitDrill();
			else this.close();
			return false;
		});
		this.scope.register([], "Tab", (evt) => {
			evt.preventDefault();
			this.cycleMode();
			return false;
		});

		if (!this.plugin.settings.isPro) return;

		this.scope.register(["Mod"], " ", (evt) => {
			evt.preventDefault();
			this.toggleCheck();
			return false;
		});
		this.scope.register(["Mod"], "d", (evt) => {
			evt.preventDefault();
			this.toggleStarSelected();
			return false;
		});
		this.scope.register(["Mod"], "s", (evt) => {
			evt.preventDefault();
			this.saveCustomSearch();
			return false;
		});
	}

	private focusInput(): void {
		const applyFocus = () => {
			if (!this.inputEl?.isConnected) return;
			if (document.activeElement === this.inputEl) return;
			this.inputEl.focus({ preventScroll: true });
			const end = this.inputEl.value.length;
			this.inputEl.setSelectionRange(end, end);
		};

		applyFocus();
		window.requestAnimationFrame(applyFocus);
		window.setTimeout(applyFocus, 0);
		window.setTimeout(applyFocus, 50);
	}
}
