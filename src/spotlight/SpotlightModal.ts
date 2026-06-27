import { App, Modal, TFile, setIcon } from "obsidian";
import type VaultSpotlightPlugin from "../main";
import { FileSearcher } from "../search/FileSearcher";
import { ContentSearcher } from "../search/ContentSearcher";
import { highlightMatches, tokenizeQuery } from "../search/fuzzy";
import type { CustomSearch } from "../settings";

type ResultItem =
	| {
			kind: "file";
			file: TFile;
			score: number;
			matchIndices: number[];
			modifiedLabel: string;
	  }
	| {
			kind: "content";
			file: TFile;
			line: number;
			snippet: string;
			score: number;
	  };

export class SpotlightModal extends Modal {
	private inputEl!: HTMLInputElement;
	private resultsEl!: HTMLDivElement;
	private footerEl!: HTMLDivElement;
	private modeBadgeEl!: HTMLSpanElement;
	private items: ResultItem[] = [];
	private selectedIndex = 0;
	private checkedPaths = new Set<string>();
	private searchTimer: number | null = null;
	private fileSearcher: FileSearcher;
	private contentSearcher: ContentSearcher;
	private initialQuery: string;

	constructor(
		app: App,
		private plugin: VaultSpotlightPlugin,
		initialQuery = ""
	) {
		super(app);
		this.fileSearcher = new FileSearcher(app);
		this.contentSearcher = new ContentSearcher(app);
		this.initialQuery = initialQuery;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("vault-spotlight-modal");

		const inputWrap = contentEl.createDiv({ cls: "vault-spotlight-input-wrap" });
		const searchIcon = inputWrap.createSpan({ cls: "vault-spotlight-item-icon" });
		setIcon(searchIcon, "search");

		this.inputEl = inputWrap.createEl("input", {
			type: "text",
			placeholder: "Search files… try #tag @status:done or > content",
		});
		this.inputEl.value = this.initialQuery;

		this.modeBadgeEl = inputWrap.createSpan({ cls: "vault-spotlight-mode-badge", text: "Files" });

		this.resultsEl = contentEl.createDiv({ cls: "vault-spotlight-results" });
		this.footerEl = contentEl.createDiv({ cls: "vault-spotlight-footer" });
		this.renderFooter();

		if (!this.plugin.settings.isPro) {
			const cta = contentEl.createDiv({ cls: "vault-spotlight-pro-cta" });
			cta.createSpan({ text: "Pro: batch open, content search, custom commands — " });
			const link = cta.createEl("a", { text: "$8 one-time", href: "https://ivala6.gumroad.com/l/vault-spotlight" });
			link.setAttr("target", "_blank");
		}

		this.inputEl.addEventListener("input", () => this.scheduleSearch());
		this.inputEl.addEventListener("keydown", (evt) => this.onKeydown(evt));

		this.scope.register([], "ArrowDown", (evt) => {
			evt.preventDefault();
			this.moveSelection(1);
		});
		this.scope.register([], "ArrowUp", (evt) => {
			evt.preventDefault();
			this.moveSelection(-1);
		});
		this.scope.register([], "Enter", (evt) => {
			evt.preventDefault();
			void this.activateSelection();
		});
		this.scope.register([], "Escape", () => this.close());

		if (this.plugin.settings.isPro) {
			this.scope.register(["Mod"], " ", (evt) => {
				evt.preventDefault();
				this.toggleCheck();
			});
			this.scope.register(["Mod"], "s", (evt) => {
				evt.preventDefault();
				void this.saveCustomSearch();
			});
		}

		this.inputEl.focus();
		void this.runSearch();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private scheduleSearch(): void {
		if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
		this.searchTimer = window.setTimeout(() => void this.runSearch(), 80);
	}

	private async runSearch(): Promise<void> {
		const query = this.inputEl.value;
		const parsed = tokenizeQuery(query);
		const isContent = parsed.contentMode;

		if (isContent && !this.plugin.settings.isPro) {
			this.modeBadgeEl.setText("Pro only");
			this.modeBadgeEl.addClass("is-pro");
			this.items = [];
			this.renderResults("Content search requires Vault Spotlight Pro.");
			return;
		}

		this.modeBadgeEl.removeClass("is-pro");
		this.modeBadgeEl.setText(isContent ? "Content" : "Files");

		if (isContent) {
			const text = parsed.textTokens.join(" ");
			const contentResults = await this.contentSearcher.search(text);
			this.items = contentResults.map((r) => ({
				kind: "content" as const,
				file: r.file,
				line: r.line,
				snippet: r.snippet,
				score: r.score,
			}));
		} else {
			const fileResults = await this.fileSearcher.search({
				textTokens: parsed.textTokens,
				tags: parsed.tags,
				properties: parsed.properties,
				recentPaths: this.plugin.settings.recentPaths,
			});
			this.items = fileResults.map((r) => ({
				kind: "file" as const,
				file: r.file,
				score: r.score,
				matchIndices: r.matchIndices,
				modifiedLabel: r.modifiedLabel,
			}));
		}

		this.selectedIndex = 0;
		this.renderResults();
	}

	private renderResults(emptyMessage?: string): void {
		this.resultsEl.empty();

		if (emptyMessage) {
			this.resultsEl.createDiv({ cls: "vault-spotlight-empty", text: emptyMessage });
			return;
		}

		if (this.items.length === 0) {
			this.resultsEl.createDiv({
				cls: "vault-spotlight-empty",
				text: "No matches. Try fewer filters or a different query.",
			});
			return;
		}

		this.items.forEach((item, index) => {
			const row = this.resultsEl.createDiv({
				cls: "vault-spotlight-item",
			});
			if (index === this.selectedIndex) row.addClass("is-selected");
			if (this.checkedPaths.has(item.file.path)) row.addClass("is-checked");

			const icon = row.createSpan({ cls: "vault-spotlight-item-icon" });
			setIcon(icon, item.kind === "content" ? "text" : "file-text");

			const body = row.createDiv({ cls: "vault-spotlight-item-body" });
			const title = body.createDiv({ cls: "vault-spotlight-item-title" });

			if (item.kind === "file") {
				title.innerHTML = highlightMatches(item.file.basename, item.matchIndices);
				const meta = body.createDiv({ cls: "vault-spotlight-item-meta", text: item.file.parent?.path ?? "/" });
				if (this.plugin.settings.showModifiedTime) {
					meta.setText(`${meta.textContent} · ${item.modifiedLabel}`);
				}
			} else {
				title.setText(`${item.file.basename}:${item.line}`);
				body.createDiv({ cls: "vault-spotlight-item-snippet", text: item.snippet });
				body.createDiv({ cls: "vault-spotlight-item-meta", text: item.file.path });
			}

			row.addEventListener("mouseenter", () => {
				this.selectedIndex = index;
				this.renderResults();
			});
			row.addEventListener("mousedown", (evt) => {
				evt.preventDefault();
				this.selectedIndex = index;
				void this.activateSelection();
			});
		});
	}

	private renderFooter(): void {
		this.footerEl.empty();
		const left = this.footerEl.createSpan();
		left.createEl("kbd", { text: "↑↓" });
		left.appendText(" navigate  ");
		left.createEl("kbd", { text: "↵" });
		left.appendText(" open");

		if (this.plugin.settings.isPro) {
			left.appendText("  ");
			left.createEl("kbd", { text: "Ctrl+Space" });
			left.appendText(" multi-select  ");
			left.createEl("kbd", { text: ">" });
			left.appendText(" content search");
		}

		const right = this.footerEl.createSpan();
		if (this.checkedPaths.size > 0) {
			right.setText(`${this.checkedPaths.size} selected`);
		}
	}

	private moveSelection(delta: number): void {
		if (this.items.length === 0) return;
		this.selectedIndex = (this.selectedIndex + delta + this.items.length) % this.items.length;
		this.renderResults();
		const selected = this.resultsEl.querySelector(".is-selected");
		selected?.scrollIntoView({ block: "nearest" });
	}

	private toggleCheck(): void {
		const item = this.items[this.selectedIndex];
		if (!item) return;
		if (this.checkedPaths.has(item.file.path)) {
			this.checkedPaths.delete(item.file.path);
		} else {
			this.checkedPaths.add(item.file.path);
		}
		this.renderResults();
		this.renderFooter();
	}

	private async activateSelection(): Promise<void> {
		const targets =
			this.checkedPaths.size > 0
				? this.items.filter((i) => this.checkedPaths.has(i.file.path))
				: [this.items[this.selectedIndex]].filter(Boolean);

		if (targets.length === 0) return;

		for (const item of targets) {
			await this.openItem(item, targets.length > 1);
			this.plugin.trackRecent(item.file.path);
		}

		this.checkedPaths.clear();
		this.close();
	}

	private async openItem(item: ResultItem, newTab: boolean): Promise<void> {
		const leaf = this.app.workspace.getLeaf(newTab);
		await leaf.openFile(item.file);
		if (item.kind === "content") {
			const view = leaf.view;
			if ("editor" in view && view.editor) {
				view.editor.setCursor({ line: item.line - 1, ch: 0 });
				view.editor.scrollIntoView({ from: { line: item.line - 1, ch: 0 }, to: { line: item.line - 1, ch: 0 } }, true);
			}
		}
	}

	private async saveCustomSearch(): Promise<void> {
		const query = this.inputEl.value.trim();
		if (!query) return;
		const name = prompt("Name this custom search:");
		if (!name) return;

		const entry: CustomSearch = {
			id: crypto.randomUUID(),
			name,
			query,
		};
		this.plugin.settings.customSearches.push(entry);
		await this.plugin.saveSettings();
		this.plugin.registerCustomSearchCommand(entry);
	}

	private onKeydown(evt: KeyboardEvent): void {
		if (evt.key === "Tab" && this.plugin.settings.isPro) {
			evt.preventDefault();
			const val = this.inputEl.value;
			if (val.startsWith(">")) {
				this.inputEl.value = val.slice(1).trim();
			} else {
				this.inputEl.value = `> ${val}`;
			}
			void this.runSearch();
		}
	}
}