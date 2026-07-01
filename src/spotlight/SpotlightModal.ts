import { App, type EventRef, MarkdownView, Modal, TFile, setIcon } from "obsidian";
import type VaultSpotlightPlugin from "../main";
import { FileSearcher } from "../search/FileSearcher";
import { renderHighlightedText, tokenizeQuery } from "../search/fuzzy";
import { SaveSearchPromptModal } from "./SaveSearchPromptModal";
import { iconForFileKind, type VaultFileKind } from "../search/vaultFiles";

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
	  }
	| {
			kind: "content";
			file: TFile;
			line: number;
			snippet: string;
			score: number;
			engine: "ripgrep" | "vault" | "canvas";
	  };

export class SpotlightModal extends Modal {
	private inputEl!: HTMLInputElement;
	private resultsEl!: HTMLDivElement;
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
	private initialQuery: string;
	private metadataRef: EventRef | null = null;

	constructor(
		app: App,
		private plugin: VaultSpotlightPlugin,
		initialQuery = ""
	) {
		super(app);
		this.shouldRestoreSelection = false;
		this.fileSearcher = new FileSearcher(app);
		this.initialQuery = initialQuery;
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
			attr: { spellcheck: "false", autocomplete: "off", autofocus: "true" },
		});
		this.inputEl.value = this.initialQuery;

		this.hintEl = header.createDiv({ cls: "vault-spotlight-hint" });
		this.updateHint();

		this.resultsEl = contentEl.createDiv({ cls: "vault-spotlight-results" });
		this.renderLoading();

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
		this.plugin.onSpotlightClosed(this);
		this.containerEl.removeClass("vault-spotlight-container");
		this.contentEl.empty();
	}

	private updateHint(): void {
		const isPro = this.plugin.settings.isPro;
		this.hintEl.empty();
		this.hintEl.createEl("span", { text: "Try " });
		this.hintEl.createEl("code", { text: "#journal" });
		this.hintEl.appendText(" ");
		this.hintEl.createEl("code", { text: "@tags:journal" });
		if (isPro) {
			this.hintEl.appendText(" · ");
			this.hintEl.createEl("code", { text: "> phrase" });
			this.hintEl.appendText(" · ");
			this.hintEl.createEl("code", { text: "ext:pdf" });
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

	private async runSearch(): Promise<void> {
		const generation = ++this.searchGeneration;
		const query = this.inputEl.value;
		const parsed = tokenizeQuery(query);
		const isContent = parsed.contentMode;
		const isEmptyQuery = query.trim().length === 0;
		const isPro = this.plugin.settings.isPro;

		this.isLoading = true;
		this.renderLoading();

		if (isContent && !isPro) {
			this.modeBadgeEl.setText("Pro");
			this.modeBadgeEl.removeClass("is-content");
			this.modeBadgeEl.addClass("is-pro");
			this.items = [];
			this.isLoading = false;
			this.renderEmptyState(
				"lock",
				"Content search is a Pro feature",
				"Search inside note bodies with queries like > meeting notes."
			);
			this.updateStatus(0);
			return;
		}

		this.modeBadgeEl.removeClass("is-pro");
		if (isContent) {
			this.modeBadgeEl.setText("Content");
			this.modeBadgeEl.addClass("is-content");
		} else {
			this.modeBadgeEl.setText(isEmptyQuery ? "Browse" : "Files");
			this.modeBadgeEl.removeClass("is-content");
		}

		if (isContent) {
			const text = parsed.textTokens.join(" ");
			const contentResults = await this.plugin.contentSearcher.search(text, {
				useRipgrep: isPro,
				ripgrepCommand: this.plugin.settings.ripgrepCommand,
				includeCanvas: isPro && this.plugin.settings.includeCanvas,
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
		} else {
			const fileResults = await this.fileSearcher.search({
				textTokens: parsed.textTokens,
				tags: parsed.tags,
				properties: parsed.properties,
				extFilters: isPro ? parsed.extFilters : [],
				recentPaths: this.plugin.settings.recentPaths,
				starredPaths: isPro ? this.plugin.settings.starredPaths : [],
				includeCanvas: isPro && this.plugin.settings.includeCanvas,
				includePdf: isPro && this.plugin.settings.includePdf,
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
			}));
		}

		this.isLoading = false;
		this.selectedIndex = 0;
		this.renderResults();
		this.updateStatus(this.items.length);
	}

	private getBrowseSection(item: ResultItem): string | null {
		if (item.kind !== "file" || this.inputEl.value.trim().length > 0) return null;
		if (item.isStarred) return "Starred";
		if (item.isRecent) return "Recent";
		return "All notes";
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
			const query = this.inputEl.value.trim();
			if (query.length === 0) {
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

			const row = this.resultsEl.createDiv({ cls: "vault-spotlight-item" });
			row.dataset.index = String(index);
			this.applyRowState(row, index);

			if (this.plugin.settings.isPro) {
				const check = row.createDiv({ cls: "vault-spotlight-check" });
				if (this.checkedPaths.has(item.file.path)) {
					setIcon(check, "check");
				}
			}

			const iconWrap = row.createDiv({ cls: "vault-spotlight-item-icon-wrap" });
			if (item.kind === "file") {
				setIcon(iconWrap, iconForFileKind(item.fileKind));
				row.toggleClass("is-starred", item.isStarred);
			} else {
				setIcon(iconWrap, item.file.extension === "canvas" ? "layout-dashboard" : "text");
			}

			const body = row.createDiv({ cls: "vault-spotlight-item-body" });
			const titleRow = body.createDiv({ cls: "vault-spotlight-item-title-row" });
			const title = titleRow.createDiv({ cls: "vault-spotlight-item-title" });

			if (item.kind === "file") {
				renderHighlightedText(title, item.file.basename, item.matchIndices);
				if (item.isStarred && !isEmptyQuery) {
					titleRow.createSpan({ cls: "vault-spotlight-item-badge is-star", text: "Starred" });
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
				const folder = item.file.parent?.path || "/";
				body.createDiv({ cls: "vault-spotlight-item-meta", text: folder });
			} else {
				title.setText(item.file.basename);
				const engineLabel =
					item.engine === "ripgrep" ? "Ripgrep" : item.engine === "canvas" ? "Canvas" : "Match";
				titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: `${engineLabel} · L${item.line}` });
				body.createDiv({ cls: "vault-spotlight-item-snippet", text: item.snippet });
				body.createDiv({ cls: "vault-spotlight-item-meta", text: item.file.path });
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
		});
	}

	private applyRowState(row: HTMLElement, index: number): void {
		row.toggleClass("is-selected", index === this.selectedIndex);
		const item = this.items[index];
		if (item) {
			row.toggleClass("is-checked", this.checkedPaths.has(item.file.path));
		}
	}

	private updateSelectionHighlight(): void {
		const rows = this.resultsEl.querySelectorAll<HTMLElement>(".vault-spotlight-item");
		rows.forEach((row) => {
			const index = Number(row.dataset.index);
			this.applyRowState(row, index);
		});
		const selected = this.resultsEl.querySelector(".is-selected");
		selected?.scrollIntoView({ block: "nearest" });
	}

	private renderFooter(): void {
		this.footerEl.empty();
		const shortcuts = this.footerEl.createDiv({ cls: "vault-spotlight-shortcuts" });

		this.addShortcut(shortcuts, ["↑", "↓"], "navigate");
		this.addShortcut(shortcuts, ["↵"], "open");

		if (this.plugin.settings.isPro) {
			this.addShortcut(shortcuts, ["Ctrl", "D"], "star");
			this.addShortcut(shortcuts, ["Ctrl", "Space"], "select");
			this.addShortcut(shortcuts, ["Tab"], "mode");
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
		if (!item) return;
		if (this.checkedPaths.has(item.file.path)) {
			this.checkedPaths.delete(item.file.path);
		} else {
			this.checkedPaths.add(item.file.path);
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

	private async activateSelection(): Promise<void> {
		const targets =
			this.checkedPaths.size > 0
				? this.items.filter((i) => this.checkedPaths.has(i.file.path))
				: [this.items[this.selectedIndex]].filter(Boolean);

		if (targets.length === 0) return;

		this.checkedPaths.clear();
		this.close();

		for (const item of targets) {
			await this.openItem(item, targets.length > 1);
			this.plugin.trackRecent(item.file.path);
		}
	}

	private async openItem(item: ResultItem, newTab: boolean): Promise<void> {
		const leaf = this.app.workspace.getLeaf(newTab);
		await leaf.openFile(item.file);
		if (item.kind === "content" && item.file.extension === "md" && leaf.view instanceof MarkdownView) {
			const editor = leaf.view.editor;
			editor.setCursor({ line: item.line - 1, ch: 0 });
			editor.scrollIntoView(
				{ from: { line: item.line - 1, ch: 0 }, to: { line: item.line - 1, ch: 0 } },
				true
			);
		}
	}

	private saveCustomSearch(): void {
		const query = this.inputEl.value.trim();
		if (!query) return;

		new SaveSearchPromptModal(this.app, (name) => {
			const entry = {
				id: crypto.randomUUID(),
				name,
				query,
			};
			this.plugin.settings.customSearches.push(entry);
			void this.plugin.saveSettings();
			this.plugin.registerCustomSearchCommand(entry);
		}).open();
	}

	private toggleContentMode(): void {
		const val = this.inputEl.value;
		if (val.startsWith(">")) {
			this.inputEl.value = val.slice(1).trim();
		} else {
			this.inputEl.value = val ? `> ${val}` : "> ";
		}
		this.focusInput();
		void this.runSearch();
	}

	private registerScopeShortcuts(): void {
		// The modal's Scope is pushed onto Obsidian's keymap while the modal is
		// open, so these fire regardless of which element inside the modal holds
		// DOM focus. That is what makes navigation and the Pro shortcuts work
		// even before the user clicks into the search box. Typed characters are
		// left untouched here so they flow into the focused input natively.
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
		this.scope.register([], "Escape", (evt) => {
			evt.preventDefault();
			this.close();
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
		this.scope.register([], "Tab", (evt) => {
			evt.preventDefault();
			this.toggleContentMode();
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