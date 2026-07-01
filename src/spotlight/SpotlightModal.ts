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
	normalizePath,
	setIcon,
} from "obsidian";
import type VaultSpotlightPlugin from "../main";
import { FileSearcher } from "../search/FileSearcher";
import { HeadingSearcher } from "../search/HeadingSearcher";
import { CommandSearcher } from "../search/CommandSearcher";
import { renderHighlightedText, tokenizeQuery } from "../search/fuzzy";
import { SaveSearchPromptModal } from "./SaveSearchPromptModal";
import { PromptModal } from "./PromptModal";
import { iconForFileKind, type VaultFileKind } from "../search/vaultFiles";

export type SpotlightMode = "files" | "content" | "headings" | "commands";

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
	  }
	| {
			kind: "history";
			query: string;
	  }
	| {
			kind: "create";
			name: string;
	  };

const MODE_ORDER: SpotlightMode[] = ["files", "content", "headings", "commands"];

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
	private initialQuery: string;
	private mode: SpotlightMode;
	private metadataRef: EventRef | null = null;

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

		this.inputEl.addEventListener("input", () => this.scheduleSearch());

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
		return this.plugin.settings.isPro && this.plugin.settings.showPreview;
	}

	private updateHint(): void {
		const isPro = this.plugin.settings.isPro;
		this.hintEl.empty();
		this.hintEl.createEl("span", { text: "Try " });
		this.hintEl.createEl("code", { text: "#journal" });
		this.hintEl.appendText(" ");
		this.hintEl.createEl("code", { text: "@tags:journal" });
		this.hintEl.appendText(" · ");
		this.hintEl.createEl("code", { text: "Tab" });
		this.hintEl.appendText(" mode · ");
		this.hintEl.createEl("code", { text: ": command" });
		if (isPro) {
			this.hintEl.appendText(" · ");
			this.hintEl.createEl("code", { text: "> phrase" });
			this.hintEl.appendText(" · ");
			this.hintEl.createEl("code", { text: "Ctrl+D" });
			this.hintEl.appendText(" star");
		}
	}

	private hasMetadataFilters(): boolean {
		const parsed = tokenizeQuery(this.inputEl?.value ?? "");
		return parsed.tags.length > 0 || parsed.properties.length > 0;
	}

	private scheduleSearch(): void {
		if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
		this.searchTimer = window.setTimeout(() => void this.runSearch(), 60);
	}

	private effectiveMode(trimmed: string): SpotlightMode {
		// Leading prefixes always win over the Tab-toggled mode, so they stay
		// discoverable: ">" → content search, ":" → command palette.
		if (trimmed.startsWith(">")) return "content";
		if (trimmed.startsWith(":")) return "commands";
		return this.mode;
	}

	private async runSearch(): Promise<void> {
		const generation = ++this.searchGeneration;
		const raw = this.inputEl.value;
		const trimmed = raw.trim();
		const mode = this.effectiveMode(trimmed);
		const isEmptyQuery = trimmed.length === 0;
		const isPro = this.plugin.settings.isPro;
		const excludeFolders = this.plugin.settings.excludeFolders;

		this.isLoading = true;
		this.renderLoading();

		try {
			if ((mode === "content" || mode === "headings") && !isPro) {
				this.setBadge("Pro", "is-pro");
				this.items = [];
				this.isLoading = false;
				this.renderEmptyState(
					"lock",
					mode === "content" ? "Content search is a Pro feature" : "Heading jump is a Pro feature",
					mode === "content"
						? "Search inside note bodies with queries like > meeting notes."
						: "Jump straight to any heading across your vault."
				);
				this.updateStatus(0);
				return;
			}

			if (mode === "commands") {
				const cmdQuery = trimmed.startsWith(":") ? trimmed.replace(/^:\s?/, "").trim() : trimmed;
				this.setBadge("Commands", "is-content");
				const commandResults = this.commandSearcher.search(cmdQuery, 60);
				if (generation !== this.searchGeneration) return;
				this.items = commandResults.map((r) => ({
					kind: "command" as const,
					id: r.id,
					name: r.name,
					matchIndices: r.matchIndices,
				}));
			} else if (mode === "content") {
				const text = trimmed.startsWith(">") ? trimmed.replace(/^>\s?/, "").trim() : trimmed;
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
					includeCanvas: isPro && this.plugin.settings.includeCanvas,
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
				const headingResults = this.headingSearcher.search(trimmed, { excludeFolders, limit: 60 });
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
			} else {
				this.setBadge(isEmptyQuery ? "Browse" : "Files", null);
				const parsed = tokenizeQuery(raw);
				const fileResults = await this.fileSearcher.search({
					textTokens: parsed.textTokens,
					tags: parsed.tags,
					properties: parsed.properties,
					extFilters: isPro ? parsed.extFilters : [],
					recentPaths: this.plugin.settings.recentPaths,
					starredPaths: isPro ? this.plugin.settings.starredPaths : [],
					bookmarkedPaths: this.plugin.getBookmarkedPaths(),
					includeCanvas: isPro && this.plugin.settings.includeCanvas,
					includePdf: isPro && this.plugin.settings.includePdf,
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

				// Offer to create a note when a plain name search finds nothing.
				const noFilters =
					parsed.tags.length === 0 && parsed.properties.length === 0 && parsed.extFilters.length === 0;
				if (this.items.length === 0 && !isEmptyQuery && noFilters) {
					this.items = [{ kind: "create", name: trimmed }];
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
		if (item.kind !== "file" || this.inputEl.value.trim().length > 0) return null;
		if (item.isStarred) return "Starred";
		if (item.isBookmarked) return "Bookmarks";
		if (item.isRecent) return "Recent";
		return "All notes";
	}

	private itemFile(item: ResultItem): TFile | null {
		return item.kind === "file" ||
			item.kind === "content" ||
			item.kind === "heading"
			? item.file
			: null;
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
				titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: "Command" });
				body.createDiv({ cls: "vault-spotlight-item-meta", text: "Run command" });
			} else if (item.kind === "history") {
				setIcon(iconWrap, "history");
				title.setText(item.query);
				titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: "Recent search" });
				body.createDiv({ cls: "vault-spotlight-item-meta", text: "Press ↵ to search again" });
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
		this.addShortcut(shortcuts, ["Tab"], "mode");
		this.addShortcut(shortcuts, ["Ctrl", "↵"], "actions");

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
		this.updateSelectionHighlight();
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
		this.inputEl.value = this.inputEl.value.replace(/^\s*[>:]\s?/, "");
		this.focusInput();
		void this.runSearch();
	}

	private async activateSelection(): Promise<void> {
		const selected = this.items[this.selectedIndex];
		if (!selected) return;

		if (selected.kind === "history") {
			// Re-run a past search without leaving the modal.
			this.inputEl.value = selected.query;
			this.focusInput();
			void this.runSearch();
			return;
		}

		if (selected.kind === "command") {
			this.close();
			this.commandSearcher.execute(selected.id);
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

		for (const item of targets) {
			const file = this.itemFile(item);
			if (!file) continue;
			try {
				await this.openItem(item, targets.length > 1);
				this.plugin.trackRecent(file.path);
			} catch (err) {
				console.error("[VaultSpotlight] failed to open", file.path, err);
			}
		}
	}

	private async openItem(item: ResultItem, newTab: boolean): Promise<void> {
		const file = this.itemFile(item);
		if (!file) return;
		const leaf = this.app.workspace.getLeaf(newTab);
		await leaf.openFile(file);
		const line = item.kind === "content" || item.kind === "heading" ? item.line : null;
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
		const q = raw.replace(/^[>:]\s?/, "").trim();
		if (q.length > 0) this.plugin.trackSearch(q);
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
		if (item.kind === "content") {
			const q = this.inputEl.value.trim().replace(/^>\s?/, "").trim();
			return q.split(/\s+/).filter(Boolean);
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
		this.scope.register(["Mod"], "Enter", (evt) => {
			evt.preventDefault();
			const item = this.items[this.selectedIndex];
			if (item) this.openActionsMenu(item);
			return false;
		});
		this.scope.register([], "Escape", (evt) => {
			evt.preventDefault();
			this.close();
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
