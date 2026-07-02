import {
	App,
	Component,
	type EventRef,
	MarkdownRenderer,
	MarkdownView,
	Menu,
	Notice,
	Modal,
	TFile,
	TFolder,
	type WorkspaceLeaf,
	normalizePath,
	setIcon,
} from "obsidian";
import type VaultSpotlightPlugin from "../main";
import { FileSearcher } from "../search/FileSearcher";
import { HeadingSearcher } from "../search/HeadingSearcher";
import { CommandSearcher } from "../search/CommandSearcher";
import { SymbolSearcher, iconForSymbolType, type SymbolType } from "../search/SymbolSearcher";
import { EditorSearcher } from "../search/EditorSearcher";
import { detectModeFromPrefix, parseHeadingQuery } from "../core/modeTriggers.mjs";
import { fuzzyMatch, renderHighlightedText, tokenizeQuery } from "../search/fuzzy";
import { SaveSearchPromptModal } from "./SaveSearchPromptModal";
import { PromptModal } from "./PromptModal";
import { getVaultFileKind, iconForFileKind, type VaultFileKind } from "../search/vaultFiles";
import { applyTagToMarkdown, removeTagFromMarkdown, setFrontmatterProperty } from "../core/frontmatterTags.mjs";
import { buildMocMarkdown, buildResultMarkdown } from "../core/resultMarkdown.mjs";
import { activeProfile, createProfileFromSettings } from "../core/searchProfiles.mjs";
import { detectSearchIntegrations } from "../core/integrations.mjs";
import { findBacklinks, findOutlinks } from "../core/linkGraph.mjs";

export type SpotlightMode =
	| "files"
	| "content"
	| "headings"
	| "symbols"
	| "commands"
	| "links"
	| "editors"
	| "folders";

type ResultItem =
	| {
			kind: "file";
			file: TFile;
			score: number;
			matchIndices: number[];
			modifiedLabel: string;
			fileKind: VaultFileKind;
			isRecent: boolean;
			isStarred: boolean;
			isBookmarked: boolean;
	  }
	| {
			kind: "content";
			file: TFile;
			line: number;
			snippet: string;
			score: number;
			engine: "ripgrep" | "vault" | "canvas";
	  }
	| {
			kind: "heading";
			file: TFile;
			line: number;
			heading: string;
			level: number;
			score: number;
			matchIndices: number[];
	  }
	| {
			kind: "command";
			id: string;
			name: string;
			matchIndices: number[];
			isRecent?: boolean;
	  }
	| {
			kind: "symbol";
			file: TFile;
			line: number;
			text: string;
			symbolType: SymbolType;
			level: number;
			matchIndices: number[];
	  }
	| {
			kind: "editor";
			leaf: WorkspaceLeaf;
			file: TFile | null;
			title: string;
			viewType: string;
			isActive: boolean;
			isPinned: boolean;
			matchIndices: number[];
	  }
	| {
			kind: "folder";
			folder: TFolder;
			matchIndices: number[];
	  }
	| {
			kind: "history";
			query: string;
	  }
	| {
			kind: "collection";
			id: string;
			name: string;
			query: string;
			isPinned: boolean;
	  }
	| {
			kind: "profile";
			id: string;
			name: string;
			defaultMode: SpotlightMode;
			defaultQuery: string;
			isActive: boolean;
	  }
	| {
			kind: "action";
			action: SpotlightAction;
	  }
	| {
			kind: "create";
			name: string;
	  };

type SpotlightAction = {
	id: string;
	name: string;
	description: string;
	requiresPro?: boolean;
	run: () => void | Promise<void>;
};

/** Where to open a result: null = current tab, or an Obsidian pane type. */
type PaneTarget = "tab" | "split" | "window" | null;

const MODE_ORDER: SpotlightMode[] = [
	"files",
	"content",
	"headings",
	"symbols",
	"commands",
	"links",
	"editors",
	"folders",
];

export class SpotlightModal extends Modal {
	private inputEl!: HTMLInputElement;
	private resultsEl!: HTMLDivElement;
	private previewEl: HTMLDivElement | null = null;
	private previewComponent: Component | null = null;
	private previewTimer: number | null = null;
	private footerEl!: HTMLDivElement;
	private statusEl!: HTMLSpanElement;
	private modeBadgeEl!: HTMLSpanElement;
	private hintEl!: HTMLDivElement;
	private items: ResultItem[] = [];
	private selectedIndex = 0;
	private checkedPaths = new Set<string>();
	private searchTimer: number | null = null;
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
			this.previewEl = body.createDiv({ cls: "vault-spotlight-preview" });
			this.containerEl.addClass("has-preview");
			this.previewComponent = new Component();
			this.previewComponent.load();
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
			const drillMode =
				evt.key === prefixes.symbols ? "symbols" : evt.key === prefixes.links ? "links" : null;
			if (!drillMode) return;
			const item = this.items[this.selectedIndex];
			const file = item ? this.itemFile(item) : null;
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
		if (this.previewTimer !== null) {
			window.clearTimeout(this.previewTimer);
			this.previewTimer = null;
		}
		if (this.previewComponent) {
			this.previewComponent.unload();
			this.previewComponent = null;
		}
		this.previewEl = null;
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

	private updateHint(): void {
		const isPro = this.plugin.settings.isPro;
		const prefixes = this.plugin.settings.modePrefixes;
		this.hintEl.empty();
		this.hintEl.createEl("span", { text: "Try " });
		this.hintEl.createEl("code", { text: "#journal" });
		this.hintEl.appendText(" · ");
		this.hintEl.createEl("code", { text: "Tab" });
		this.hintEl.appendText(" mode · ");
		this.hintEl.createEl("code", { text: `${prefixes.commands} command` });
		this.hintEl.appendText(" · ");
		this.hintEl.createEl("code", { text: `${prefixes.symbols} outline` });
		this.hintEl.appendText(" · ");
		this.hintEl.createEl("code", { text: `${prefixes.editors} tabs` });
		this.hintEl.appendText(" · ");
		this.hintEl.createEl("code", { text: `${prefixes.folders} folders` });
		if (isPro) {
			this.hintEl.appendText(" · ");
			this.hintEl.createEl("code", { text: `${prefixes.content} phrase` });
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

		this.isLoading = true;
		this.renderLoading();

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
					ripgrepCommand: this.plugin.settings.ripgrepCommand,
					includeCanvas: isPro && includeCanvas,
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

	private itemFile(item: ResultItem): TFile | null {
		if (item.kind === "file" || item.kind === "content" || item.kind === "heading" || item.kind === "symbol") {
			return item.file;
		}
		if (item.kind === "editor") return item.file;
		return null;
	}

	private fileToResult(file: TFile, score: number): ResultItem {
		return {
			kind: "file",
			file,
			score,
			matchIndices: [],
			modifiedLabel: "",
			fileKind: getVaultFileKind(file),
			isRecent: this.plugin.settings.recentPaths.includes(file.path),
			isStarred: this.plugin.isStarred(file.path),
			isBookmarked: this.plugin.getBookmarkedPaths().includes(file.path),
		};
	}

	private linkModeItems(query: string): ResultItem[] {
		const active = this.app.workspace.getActiveFile();
		const files = this.app.vault.getMarkdownFiles();
		const q = query.replace(/^(<-|->|\[\[)\s?/, "").trim().toLowerCase();
		// Drilled-in file wins; otherwise a typed name, otherwise the active note.
		const target =
			this.drillFile ??
			(q
				? files.find((file) => file.basename.toLowerCase().includes(q) || file.path.toLowerCase().includes(q))
				: active);
		if (!target) return [];
		const resolvedLinks = this.app.metadataCache.resolvedLinks ?? {};
		const linked = query.trim().startsWith("->")
			? findOutlinks(files, resolvedLinks, target.path)
			: findBacklinks(files, resolvedLinks, target.path);
		return linked.slice(0, 60).map((file, index) => this.fileToResult(file, 1000 - index));
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
		this.resultsEl.empty();
		this.resultsEl.removeClass("vault-spotlight-loading");
		const empty = this.resultsEl.createDiv({ cls: "vault-spotlight-empty" });
		const iconWrap = empty.createDiv({ cls: "vault-spotlight-empty-icon" });
		setIcon(iconWrap, icon);
		empty.createDiv({ cls: "vault-spotlight-empty-title", text: title });
		empty.createDiv({ cls: "vault-spotlight-empty-desc", text: desc });
	}

	private renderResults(): void {
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

			const file = this.itemFile(item);

			if (this.plugin.settings.isPro && file) {
				const check = row.createDiv({ cls: "vault-spotlight-check" });
				if (this.checkedPaths.has(file.path)) {
					setIcon(check, "check");
				}
			}

			const iconWrap = row.createDiv({ cls: "vault-spotlight-item-icon-wrap" });
			const body = row.createDiv({ cls: "vault-spotlight-item-body" });
			const titleRow = body.createDiv({ cls: "vault-spotlight-item-title-row" });
			const title = titleRow.createDiv({ cls: "vault-spotlight-item-title" });

			if (item.kind === "file") {
				setIcon(iconWrap, iconForFileKind(item.fileKind));
				row.toggleClass("is-starred", item.isStarred);
				renderHighlightedText(title, item.file.basename, item.matchIndices);
				if (item.isStarred && !isEmptyQuery) {
					titleRow.createSpan({ cls: "vault-spotlight-item-badge is-star", text: "Starred" });
				} else if (item.isBookmarked && !isEmptyQuery) {
					titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: "Bookmark" });
				} else if (item.isRecent && !isEmptyQuery) {
					titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: "Recent" });
				}
				if (item.fileKind !== "markdown") {
					titleRow.createSpan({
						cls: "vault-spotlight-item-badge is-type",
						text: item.fileKind.toUpperCase(),
					});
				}
				if (this.plugin.settings.showModifiedTime) {
					titleRow.createSpan({ cls: "vault-spotlight-item-time", text: item.modifiedLabel });
				}
				body.createDiv({ cls: "vault-spotlight-item-meta", text: item.file.parent?.path || "/" });
			} else if (item.kind === "content") {
				setIcon(iconWrap, item.file.extension === "canvas" ? "layout-dashboard" : "text");
				title.setText(item.file.basename);
				const engineLabel =
					item.engine === "ripgrep" ? "Ripgrep" : item.engine === "canvas" ? "Canvas" : "Match";
				titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: `${engineLabel} · L${item.line}` });
				body.createDiv({ cls: "vault-spotlight-item-snippet", text: item.snippet });
				body.createDiv({ cls: "vault-spotlight-item-meta", text: item.file.path });
			} else if (item.kind === "heading") {
				setIcon(iconWrap, "heading");
				renderHighlightedText(title, item.heading, item.matchIndices);
				titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: `H${item.level}` });
				body.createDiv({ cls: "vault-spotlight-item-meta", text: `${item.file.basename} · L${item.line}` });
			} else if (item.kind === "command") {
				setIcon(iconWrap, "terminal-square");
				renderHighlightedText(title, item.name, item.matchIndices);
				titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: item.isRecent ? "Recent" : "Command" });
				body.createDiv({ cls: "vault-spotlight-item-meta", text: "Run command" });
			} else if (item.kind === "symbol") {
				setIcon(iconWrap, iconForSymbolType(item.symbolType));
				if (item.symbolType === "heading" && item.level > 1) {
					row.addClass(`vault-spotlight-indent-${Math.min(item.level, 6)}`);
				}
				renderHighlightedText(title, item.text, item.matchIndices);
				titleRow.createSpan({
					cls: "vault-spotlight-item-badge",
					text: item.symbolType === "heading" ? `H${item.level}` : capitalize(item.symbolType),
				});
				body.createDiv({ cls: "vault-spotlight-item-meta", text: `L${item.line}` });
			} else if (item.kind === "editor") {
				setIcon(iconWrap, item.file ? iconForFileKind(getVaultFileKind(item.file)) : "layout");
				renderHighlightedText(title, item.title, item.matchIndices);
				if (item.isActive) {
					titleRow.createSpan({ cls: "vault-spotlight-item-badge is-star", text: "Active" });
				} else if (item.isPinned) {
					titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: "Pinned" });
				}
				if (item.viewType && item.viewType !== "markdown") {
					titleRow.createSpan({ cls: "vault-spotlight-item-badge is-type", text: item.viewType.toUpperCase() });
				}
				body.createDiv({ cls: "vault-spotlight-item-meta", text: item.file ? item.file.path : "Open editor" });
			} else if (item.kind === "folder") {
				setIcon(iconWrap, "folder");
				renderHighlightedText(title, item.folder.name, item.matchIndices);
				titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: "Folder" });
				body.createDiv({
					cls: "vault-spotlight-item-meta",
					text: `${item.folder.path} · ${item.folder.children.length} item${item.folder.children.length === 1 ? "" : "s"}`,
				});
			} else if (item.kind === "history") {
				setIcon(iconWrap, "history");
				title.setText(item.query);
				titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: "Recent search" });
				body.createDiv({ cls: "vault-spotlight-item-meta", text: "Press ↵ to search again" });
			} else if (item.kind === "collection") {
				setIcon(iconWrap, item.isPinned ? "star" : "search");
				title.setText(item.name);
				titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: item.isPinned ? "Pinned collection" : "Smart collection" });
				body.createDiv({ cls: "vault-spotlight-item-meta", text: item.query });
			} else if (item.kind === "profile") {
				setIcon(iconWrap, item.isActive ? "check-circle" : "sliders-horizontal");
				title.setText(item.name);
				titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: item.isActive ? "Active profile" : "Search profile" });
				body.createDiv({ cls: "vault-spotlight-item-meta", text: `${item.defaultMode}${item.defaultQuery ? ` · ${item.defaultQuery}` : ""}` });
			} else if (item.kind === "action") {
				setIcon(iconWrap, item.action.requiresPro ? "sparkles" : "bolt");
				title.setText(item.action.name);
				titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: item.action.requiresPro ? "Pro action" : "Action" });
				body.createDiv({ cls: "vault-spotlight-item-meta", text: item.action.description });
			} else {
				setIcon(iconWrap, "file-plus");
				title.setText(`Create “${item.name}”`);
				titleRow.createSpan({ cls: "vault-spotlight-item-badge is-star", text: "New" });
				body.createDiv({ cls: "vault-spotlight-item-meta", text: "Create a new note" });
			}

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
		const file = item ? this.itemFile(item) : null;
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
		const file = item ? this.itemFile(item) : null;
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
						const f = this.itemFile(i);
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
			const file = this.itemFile(item);
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
		const file = this.itemFile(item);
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
					run: () => this.copyToClipboard(context.query, "Query copied"),
				},
			];
		}

		const file = this.itemFile(context);
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
					run: () => this.copyToClipboard(this.app.fileManager.generateMarkdownLink(file, ""), "Link copied"),
				},
				{
					id: "copy-path",
					name: "Copy path",
					description: "Copy this file path.",
					run: () => this.copyToClipboard(file.path, "Path copied"),
				},
				{
					id: "rename",
					name: "Rename",
					description: "Rename the selected note or file.",
					requiresPro: true,
					run: () => this.renameFile(file),
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
				run: () => this.copyResultsAsMarkdown(),
			},
			{
				id: "export-results",
				name: "Export results to note",
				description: "Create a Markdown note containing selected/search results.",
				requiresPro: true,
				run: () => this.exportResultsToNote(),
			},
			{
				id: "batch-add-tag",
				name: "Batch add tag",
				description: "Append a tag to selected Markdown files.",
				requiresPro: true,
				run: () => this.batchAddTag(),
			},
			{
				id: "batch-remove-tag",
				name: "Batch remove tag",
				description: "Remove a tag from selected Markdown files.",
				requiresPro: true,
				run: () => this.batchRemoveTag(),
			},
			{
				id: "batch-set-property",
				name: "Batch set property",
				description: "Set a frontmatter property on selected Markdown files.",
				requiresPro: true,
				run: () => this.batchSetProperty(),
			},
			{
				id: "batch-move",
				name: "Batch move files",
				description: "Move selected files into a target folder.",
				requiresPro: true,
				run: () => this.batchMoveFiles(),
			},
			{
				id: "batch-star",
				name: "Batch star results",
				description: "Add selected/current result files to Starred pins.",
				requiresPro: true,
				run: () => this.batchSetStarred(true),
			},
			{
				id: "batch-unstar",
				name: "Batch unstar results",
				description: "Remove selected/current result files from Starred pins.",
				requiresPro: true,
				run: () => this.batchSetStarred(false),
			},
			{
				id: "create-moc",
				name: "Create MOC from results",
				description: "Create a grouped index note from selected/current results.",
				requiresPro: true,
				run: () => this.createMocFromResults(),
			},
			{
				id: "append-links",
				name: "Append links to active note",
				description: "Append selected/current result links to the active Markdown note.",
				requiresPro: true,
				run: () => this.appendLinksToActiveNote(),
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
			const file = this.itemFile(item);
			return file ? this.checkedPaths.has(file.path) : false;
		});
		const source = checked.length > 0 ? checked : allItems;
		return source.filter((item) => !!this.itemFile(item));
	}

	private resultsAsMarkdown(): string {
		const rows = this.resultItemsForBatch().map((item) => {
			const file = this.itemFile(item);
			if (!file) return null;
			let suffix = "";
			if (item.kind === "content") suffix = ` — L${item.line}: ${item.snippet}`;
			else if (item.kind === "heading") suffix = ` — ${"#".repeat(item.level)} ${item.heading}`;
			return { link: this.app.fileManager.generateMarkdownLink(file, ""), suffix };
		}).filter(Boolean) as Array<{ link: string; suffix?: string }>;
		return buildResultMarkdown(rows);
	}

	private copyResultsAsMarkdown(): void {
		const markdown = this.resultsAsMarkdown();
		if (!markdown) {
			new Notice("Vault Spotlight: no results to copy.");
			return;
		}
		this.copyToClipboard(markdown, "Results copied");
	}

	private async exportResultsToNote(): Promise<void> {
		const markdown = this.resultsAsMarkdown();
		if (!markdown) {
			new Notice("Vault Spotlight: no results to export.");
			return;
		}
		const stamp = new Date().toISOString().slice(0, 16).replace("T", " ").replace(":", "-");
		const dir = "Vault Spotlight Exports";
		if (!this.app.vault.getAbstractFileByPath(dir)) await this.app.vault.createFolder(dir);
		const basePath = normalizePath(`${dir}/Search results ${stamp}.md`);
		let path = basePath;
		let counter = 2;
		while (this.app.vault.getAbstractFileByPath(path)) {
			path = normalizePath(`${dir}/Search results ${stamp} ${counter}.md`);
			counter++;
		}
		const note = `# Vault Spotlight search results\n\nQuery: ${this.actionReturnQuery || this.inputEl.value || "Browse"}\n\n${markdown}\n`;
		const file = await this.app.vault.create(path, note);
		this.close();
		await this.app.workspace.getLeaf(false).openFile(file);
		new Notice("Vault Spotlight: results exported.");
	}

	private batchAddTag(): void {
		const files = this.markdownFilesForBatch();
		if (files.length === 0) {
			new Notice("Vault Spotlight: select Markdown notes first.");
			return;
		}
		new PromptModal(this.app, {
			title: "Add tag to selected notes",
			initial: "spotlight",
			cta: "Add tag",
			onSubmit: (raw) => {
				const cleaned = raw.replace(/^#/, "").trim().replace(/\s+/g, "-");
				if (!cleaned) return;
				void Promise.all(files.map((file) => this.modifyMarkdownFile(file, (content) => applyTagToMarkdown(content, cleaned))))
					.then(() => new Notice(`Vault Spotlight: tag added to ${files.length} note${files.length === 1 ? "" : "s"}.`));
			},
		}).open();
	}

	private batchRemoveTag(): void {
		const files = this.markdownFilesForBatch();
		if (files.length === 0) {
			new Notice("Vault Spotlight: select Markdown notes first.");
			return;
		}
		new PromptModal(this.app, {
			title: "Remove tag from selected notes",
			initial: "spotlight",
			cta: "Remove tag",
			onSubmit: (raw) => {
				const cleaned = raw.replace(/^#/, "").trim().replace(/\s+/g, "-");
				if (!cleaned) return;
				void Promise.all(files.map((file) => this.modifyMarkdownFile(file, (content) => removeTagFromMarkdown(content, cleaned))))
					.then(() => new Notice(`Vault Spotlight: tag removed from ${files.length} note${files.length === 1 ? "" : "s"}.`));
			},
		}).open();
	}

	private batchSetProperty(): void {
		const files = this.markdownFilesForBatch();
		if (files.length === 0) {
			new Notice("Vault Spotlight: select Markdown notes first.");
			return;
		}
		new PromptModal(this.app, {
			title: "Set property on selected notes",
			initial: "status=active",
			cta: "Set property",
			onSubmit: (raw) => {
				const sep = raw.indexOf("=");
				if (sep <= 0) {
					new Notice("Vault Spotlight: use key=value.");
					return;
				}
				const key = raw.slice(0, sep).trim();
				const value = raw.slice(sep + 1).trim();
				void Promise.all(files.map((file) => this.modifyMarkdownFile(file, (content) => setFrontmatterProperty(content, key, value))))
					.then(() => new Notice(`Vault Spotlight: property set on ${files.length} note${files.length === 1 ? "" : "s"}.`));
			},
		}).open();
	}

	private batchMoveFiles(): void {
		const files = this.filesForBatch();
		if (files.length === 0) return;
		new PromptModal(this.app, {
			title: "Move selected files to folder",
			initial: "Archive",
			cta: "Move files",
			onSubmit: (raw) => {
				const folder = normalizePath(raw.trim());
				if (!folder) return;
				void (async () => {
					if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
					for (const file of files) {
						await this.app.fileManager.renameFile(file, normalizePath(`${folder}/${file.name}`));
					}
					new Notice(`Vault Spotlight: moved ${files.length} file${files.length === 1 ? "" : "s"}.`);
				})();
			},
		}).open();
	}

	private batchSetStarred(starred: boolean): void {
		const files = this.filesForBatch();
		for (const file of files) {
			const isStarred = this.plugin.isStarred(file.path);
			if (starred !== isStarred) this.plugin.toggleStar(file.path);
		}
		new Notice(`Vault Spotlight: ${starred ? "starred" : "unstarred"} ${files.length} file${files.length === 1 ? "" : "s"}.`);
		void this.runSearch();
	}

	private createMocFromResults(): void {
		const rows = this.resultItemsForBatch().map((item) => {
			const file = this.itemFile(item);
			if (!file) return null;
			return {
				link: this.app.fileManager.generateMarkdownLink(file, ""),
				folder: file.parent?.path || "/",
				snippet: item.kind === "content" ? item.snippet : item.kind === "heading" ? item.heading : "",
			};
		}).filter(Boolean) as Array<{ link: string; folder: string; snippet?: string }>;
		if (rows.length === 0) return;
		const stamp = new Date().toISOString().slice(0, 10);
		const note = buildMocMarkdown(rows, { title: `Vault Spotlight MOC ${stamp}`, groupBy: "folder", includeSnippets: true });
		void this.createExportNote(`MOC ${stamp}.md`, note, "MOC created");
	}

	private appendLinksToActiveNote(): void {
		const active = this.app.workspace.getActiveFile();
		if (!active || active.extension !== "md") {
			new Notice("Vault Spotlight: open a Markdown note first.");
			return;
		}
		const markdown = this.resultsAsMarkdown();
		if (!markdown) return;
		void this.app.vault.process(active, (content) => `${content.trimEnd()}\n\n${markdown}\n`).then(() => new Notice("Vault Spotlight: links appended."));
	}

	private markdownFilesForBatch(): TFile[] {
		return this.filesForBatch().filter((file) => file.extension === "md");
	}

	private filesForBatch(): TFile[] {
		return this.resultItemsForBatch().map((item) => this.itemFile(item)).filter((file): file is TFile => !!file);
	}

	private async modifyMarkdownFile(file: TFile, updater: (content: string) => string): Promise<void> {
		const content = await this.app.vault.cachedRead(file);
		const next = updater(content);
		if (next !== content) await this.app.vault.modify(file, next);
	}

	private async createExportNote(filename: string, note: string, message: string): Promise<void> {
		const dir = "Vault Spotlight Exports";
		if (!this.app.vault.getAbstractFileByPath(dir)) await this.app.vault.createFolder(dir);
		let path = normalizePath(`${dir}/${filename}`);
		let counter = 2;
		while (this.app.vault.getAbstractFileByPath(path)) {
			path = normalizePath(`${dir}/${filename.replace(/\.md$/, ` ${counter}.md`)}`);
			counter++;
		}
		const file = await this.app.vault.create(path, note);
		this.close();
		await this.app.workspace.getLeaf(false).openFile(file);
		new Notice(`Vault Spotlight: ${message}.`);
	}

	private openActionsMenu(item: ResultItem, evt?: MouseEvent): void {
		const file = this.itemFile(item);
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
					this.copyToClipboard(link, "Link copied");
				})
		);
		menu.addItem((i) =>
			i
				.setTitle("Copy path")
				.setIcon("copy")
				.onClick(() => this.copyToClipboard(file.path, "Path copied"))
		);
		menu.addItem((i) =>
			i
				.setTitle("Rename…")
				.setIcon("pencil")
				.onClick(() => this.renameFile(file))
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

	private copyToClipboard(text: string, okMessage: string): void {
		const clip = navigator.clipboard;
		if (clip?.writeText) {
			void clip.writeText(text).then(
				() => new Notice(`Vault Spotlight: ${okMessage}`),
				() => new Notice("Vault Spotlight: copy failed")
			);
		} else {
			new Notice("Vault Spotlight: clipboard unavailable");
		}
	}

	private renameFile(file: TFile): void {
		new PromptModal(this.app, {
			title: "Rename note",
			initial: file.basename,
			cta: "Rename",
			onSubmit: (name) => {
				const cleaned = name.replace(/[\\/:*?"<>|]/g, "").trim();
				if (!cleaned || cleaned === file.basename) return;
				const dir = file.parent?.path ? `${file.parent.path}/` : "";
				const newPath = normalizePath(`${dir}${cleaned}.${file.extension}`);
				void this.app.fileManager.renameFile(file, newPath).catch((err) => {
					console.error("[VaultSpotlight] rename failed", err);
					new Notice("Vault Spotlight: rename failed (name may already exist).");
				});
			},
		}).open();
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
		if (!this.previewEl || !this.previewComponent) return;
		if (this.previewTimer !== null) window.clearTimeout(this.previewTimer);
		const previewEl = this.previewEl;
		const component = this.previewComponent;
		const item = this.items[this.selectedIndex];

		this.previewTimer = window.setTimeout(() => {
			this.previewTimer = null;
			previewEl.empty();
			const file = item ? this.itemFile(item) : null;
			if (!file) {
				previewEl.createDiv({ cls: "vault-spotlight-preview-empty", text: "No preview" });
				return;
			}
			if (file.extension !== "md") {
				previewEl.createDiv({
					cls: "vault-spotlight-preview-empty",
					text: `${file.extension.toUpperCase()} file — no preview`,
				});
				return;
			}
			previewEl.createDiv({ cls: "vault-spotlight-preview-title", text: file.basename });
			const bodyEl = previewEl.createDiv({ cls: "vault-spotlight-preview-body markdown-rendered" });
			const terms = this.previewHighlightTerms(item);
			void this.app.vault
				.cachedRead(file)
				.then((content) => {
					if (this.previewComponent !== component || !previewEl.isConnected) return;
					return MarkdownRenderer.render(this.app, content.slice(0, 10000), bodyEl, file.path, component);
				})
				.then(() => {
					if (this.previewComponent !== component || !bodyEl.isConnected) return;
					// Scroll the matched term into view and mark it, so a content or
					// heading hit lands on the relevant passage instead of the top.
					const hit = highlightFirstMatch(bodyEl, terms);
					hit?.scrollIntoView({ block: "center" });
				})
				.catch(() => {
					previewEl.empty();
					previewEl.createDiv({ cls: "vault-spotlight-preview-empty", text: "Preview unavailable" });
				});
		}, 120);
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

/**
 * Wraps the first occurrence of any term (case-insensitive) inside `root` in a
 * <mark> and returns it, or null if no term is found. Walks text nodes so it
 * marks rendered text without disturbing the surrounding markdown structure.
 */
function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

function highlightFirstMatch(root: HTMLElement, terms: string[]): HTMLElement | null {
	const needles = terms.map((t) => t.toLowerCase()).filter((t) => t.length > 0);
	if (needles.length === 0) return null;

	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let node: Node | null;
	while ((node = walker.nextNode())) {
		const text = node.nodeValue ?? "";
		if (!text.trim()) continue;
		const low = text.toLowerCase();
		let idx = -1;
		let len = 0;
		for (const needle of needles) {
			const at = low.indexOf(needle);
			if (at !== -1 && (idx === -1 || at < idx)) {
				idx = at;
				len = needle.length;
			}
		}
		if (idx === -1) continue;

		const range = document.createRange();
		range.setStart(node, idx);
		range.setEnd(node, idx + len);
		const mark = document.createElement("mark");
		mark.className = "vault-spotlight-preview-hit";
		try {
			range.surroundContents(mark);
			return mark;
		} catch {
			return null;
		}
	}
	return null;
}
