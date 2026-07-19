import { App, MarkdownView, Notice, TFile, type WorkspaceLeaf, normalizePath } from "obsidian";
import type VaultSpotlightPlugin from "../main";
import { detectModeFromPrefix } from "../core/modeTriggers.mjs";
import { resolveOpenTargets } from "../core/activationIntent.mjs";
import { cycleMode as cycleModeHelper } from "../core/modalCopy.mjs";
import { detectSearchIntegrations, type SearchIntegrations } from "../core/integrations.mjs";
import {
	itemFile,
	type PaneTarget,
	type ResultItem,
	type SpotlightAction,
	type SpotlightMode,
} from "./resultTypes";
import type { CaptureController } from "./CaptureController";
import type { WorkflowController } from "./WorkflowController";
import type { CommandSearcher } from "../search/CommandSearcher";
import type { EditorSearcher } from "../search/EditorSearcher";
import { buildAvailableActions, type ActionHost } from "./actionBuilders";
import { openResultContextMenu } from "./contextMenu";
import * as batchOps from "./batchOps";

/**
 * What mode state + transitions need back from the view and the search controller.
 * The result set lives in SearchController and is reached through `searchItems()` /
 * `selectedItem()` / `checkedPaths()` so this never holds a stale copy — same
 * host-seam idea as WorkflowController / CaptureController / batchOps.
 */
export interface ModeHost {
	app: App;
	plugin: VaultSpotlightPlugin;
	capture: CaptureController;
	workflows: WorkflowController;
	commandSearcher: CommandSearcher;
	editorSearcher: EditorSearcher;
	inputValue(): string;
	setQuery(query: string): void;
	focusInput(): void;
	runSearch(): void;
	recordSearch(): void;
	close(): void;
	searchItems(): ResultItem[];
	selectedItem(): ResultItem | null;
	checkedPaths(): Set<string>;
	clearChecked(): void;
	selectedRowRect(): DOMRect | null;
}

/**
 * Mode state + every transition/activation extracted from SpotlightModal: the
 * current mode, the action-palette context, the drill-in target, and the
 * open/create/activate side effects. Owns that state so the searcher and view read
 * it through accessors. Pure list-building for the action palette lives in
 * actionBuilders; batch file mutation lives in batchOps.
 */
export class ModeController {
	private _mode: SpotlightMode;
	private _actionContext: ResultItem | null = null;
	private _actionReturnQuery = "";
	private _actionReturnMode: SpotlightMode = "files";
	private resultSnapshot: ResultItem[] = [];

	// explore that file without opening it. Escape restores the outer search.
	private _drillFile: TFile | null = null;
	private drillReturnQuery = "";
	private drillReturnMode: SpotlightMode = "files";
	private _hasNavigated = false;
	private _activeWorkflowId = "";

	constructor(private host: ModeHost, initialMode: SpotlightMode) {
		this._mode = initialMode;
	}

	private get plugin(): VaultSpotlightPlugin {
		return this.host.plugin;
	}

	private get app(): App {
		return this.host.app;
	}

	get mode(): SpotlightMode {
		return this._mode;
	}
	set mode(mode: SpotlightMode) {
		this._mode = mode;
	}

	get hasNavigated(): boolean {
		return this._hasNavigated;
	}
	set hasNavigated(value: boolean) {
		this._hasNavigated = value;
	}

	get activeWorkflowId(): string {
		return this._activeWorkflowId;
	}
	set activeWorkflowId(id: string) {
		this._activeWorkflowId = id;
	}

	get drillFile(): TFile | null {
		return this._drillFile;
	}

	get actionContext(): ResultItem | null {
		return this._actionContext;
	}

	get actionReturnMode(): SpotlightMode {
		return this._actionReturnMode;
	}

	get actionReturnQuery(): string {
		return this._actionReturnQuery;
	}

	clearActionContext(): void {
		this._actionContext = null;
	}

	/**
	 * Leading prefixes always win over the Tab-toggled mode, so they stay
	 * discoverable (all customizable): ">" content, ":" commands, "^" headings,
	 * "$" symbols, "~" links, "=" editors, "/" folders. The escape character
	 * ("!") forces a literal files search.
	 */
	resolveQuery(raw: string): { mode: SpotlightMode; body: string } {
		const detected = detectModeFromPrefix(
			raw,
			this.plugin.settings.modePrefixes,
			this.plugin.settings.escapeChar
		);
		if (detected.escaped) return { mode: "files", body: detected.body };
		if (detected.mode) return { mode: detected.mode, body: detected.body };
		return { mode: this._mode, body: raw.trim() };
	}

	/** Shift+Enter: create a note named after the current query text. */
	async createFromQuery(): Promise<void> {
		// For delight-layer rows, Shift+Enter does the useful thing instead of
		// creating a note titled "2+2" or the capture text.
		const selected = this.host.selectedItem();
		if (selected?.kind === "calc") {
			this.host.capture.insertCalcResult(selected);
			return;
		}
		if (selected && (selected.kind === "capture" || selected.kind === "snippet" || selected.kind === "datejump")) {
			this.safeActivate();
			return;
		}
		const { body } = this.resolveQuery(this.host.inputValue());
		if (!body) return;
		this.host.recordSearch();
		this.host.close();
		await this.createAndOpen(body);
	}

	drillInto(file: TFile, mode: SpotlightMode): void {
		this.drillReturnQuery = this.host.inputValue();
		this.drillReturnMode = this._mode;
		this._drillFile = file;
		this._mode = mode;
		this.host.setQuery("");
		this._hasNavigated = false;
		this.host.focusInput();
		this.host.runSearch();
	}

	exitDrill(): void {
		if (!this._drillFile) return;
		this._drillFile = null;
		this._mode = this.drillReturnMode;
		this.host.setQuery(this.drillReturnQuery);
		this._hasNavigated = false;
		this.host.focusInput();
		this.host.runSearch();
	}

	cycleMode(direction: 1 | -1 = 1): void {
		// While the action palette is open, mode has no effect (results are actions),
		// so Tab must not silently mutate the underlying mode behind the palette.
		if (this._actionContext) return;
		this._mode = cycleModeHelper(this._mode, {
			isPro: this.plugin.settings.isPro,
			direction,
		});
		// Drop a leading mode prefix so the toggled mode isn't overridden by it.
		const detected = detectModeFromPrefix(
			this.host.inputValue(),
			this.plugin.settings.modePrefixes,
			this.plugin.settings.escapeChar
		);
		if (detected.mode) this.host.setQuery(detected.body);
		this.host.focusInput();
		this.host.runSearch();
	}

	/**
	 * Fire-and-forget entry point for the Enter-key handlers and row clicks.
	 * activateSelection does post-close work (openFile, editor mutations, command
	 * exec, snippet insert) that can reject — e.g. an editors-mode leaf closed by
	 * sync between search and Enter, or a locked note. Because callers invoke it as
	 * `void`, an unguarded rejection would surface as an unhandled promise rejection
	 * with the modal already closed and nothing shown to the user. Contain it here.
	 */
	safeActivate(paneOverride: PaneTarget = null): void {
		this.activateSelection(paneOverride).catch((err) => {
			console.error("[VaultSpotlight] activation failed", err);
			new Notice("Vault Spotlight: could not complete that action.");
		});
	}

	private async activateSelection(paneOverride: PaneTarget = null): Promise<void> {
		const selected = this.host.selectedItem();
		if (!selected) return;

		if (selected.kind === "editor") {
			this.host.recordSearch();
			this.host.close();
			this.host.editorSearcher.activate(selected.leaf);
			if (selected.file) this.plugin.trackRecent(selected.file.path);
			return;
		}

		if (selected.kind === "folder") {
			// Browse the folder's files without leaving Spotlight.
			this._drillFile = null;
			this._mode = "files";
			this.host.setQuery(`in:"${selected.folder.path}" `);
			this.host.focusInput();
			this.host.runSearch();
			return;
		}

		if (selected.kind === "quickaction") {
			if (selected.action === "capture") {
				// Enter capture mode in place (like the folder-browse branch): the query
				// clears and the capture rows appear, so the user types their note and
				// confirms. No close — nothing has been written yet.
				this._drillFile = null;
				this._mode = "capture";
				this.host.setQuery("");
				this.host.focusInput();
				this.host.runSearch();
				return;
			}
			// daily-today: open (or create) today's daily note. resolveDatePath formats
			// the date, so any timestamp within today resolves to the same note.
			this.host.close();
			await this.host.capture.openOrCreateDatedNote(Date.now());
			return;
		}

		if (selected.kind === "history") {
			// Re-run a past search without leaving the modal.
			this.host.setQuery(selected.query);
			this.host.focusInput();
			this.host.runSearch();
			return;
		}

		if (selected.kind === "collection") {
			this.host.setQuery(selected.query);
			this._actionContext = null;
			this._mode = "files";
			this.host.focusInput();
			this.host.runSearch();
			return;
		}

		if (selected.kind === "profile") {
			this.host.workflows.activateProfile(selected.id);
			return;
		}

		if (selected.kind === "workflow") {
			this.host.workflows.applyWorkflow(selected.id);
			return;
		}

		if (selected.kind === "action") {
			if (selected.action.requiresPro && !this.plugin.settings.isPro) {
				new Notice("Vault Spotlight: Pro required for this action.");
				return;
			}
			// activateSelection is invoked as a fire-and-forget `void ...` from the
			// key handlers, so a rejecting action (e.g. openFile on a locked note)
			// would surface as an unhandled rejection. Contain it and tell the user.
			try {
				await selected.action.run();
			} catch (err) {
				console.error("[VaultSpotlight] action failed", err);
				new Notice("Vault Spotlight: action failed.");
			}
			return;
		}

		if (selected.kind === "command") {
			this.host.close();
			if (this.host.commandSearcher.execute(selected.id)) this.plugin.trackCommand(selected.id);
			return;
		}

		if (selected.kind === "create") {
			this.host.recordSearch();
			this.host.close();
			await this.createAndOpen(selected.name);
			return;
		}

		if (selected.kind === "calc") {
			this.host.capture.copyCalcResult(selected);
			return;
		}

		if (selected.kind === "datejump") {
			this.host.close();
			await this.host.capture.openOrCreateDatedNote(selected.date);
			return;
		}

		if (selected.kind === "capture") {
			await this.host.capture.runCapture(selected);
			return;
		}

		if (selected.kind === "snippet") {
			await this.host.capture.insertSnippet(selected);
			return;
		}

		// Opening a real result means the current query was useful — remember it.
		this.host.recordSearch();

		// Batch-vs-single target and pane resolution is pure and unit-tested in
		// core/activationIntent; the modal maps the decision back to items (to keep
		// each result's line for seekToItemLine) and performs the opens.
		const items = this.host.searchItems();
		const selectedFile = itemFile(selected);
		const decision = resolveOpenTargets({
			selectedPath: selectedFile ? selectedFile.path : null,
			checkedPaths: Array.from(this.host.checkedPaths()),
			visiblePaths: items.map((i) => itemFile(i)?.path).filter((p): p is string => !!p),
			paneOverride,
			defaultNewTab: this.plugin.settings.defaultNewTab,
		});
		const targets: ResultItem[] = decision.isBatch
			? items.filter((i) => {
					const f = itemFile(i);
					return !!f && decision.paths.includes(f.path);
			  })
			: selectedFile
				? [selected]
				: [];

		this.host.clearChecked();
		this.host.close();

		for (const item of targets) {
			const file = itemFile(item);
			if (!file) continue;
			try {
				await this.openItem(item, decision.target);
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
		this.seekToItemLine(leaf, item);
	}

	/**
	 * After opening a file, place the cursor on the item's 1-based line and scroll
	 * it into view — for content/heading/symbol rows in a markdown view. Shared by
	 * openItem and the context-menu open handlers so the two can't drift (the menu
	 * previously set the cursor but forgot to scroll the line into view).
	 */
	private seekToItemLine(leaf: WorkspaceLeaf, item: ResultItem): void {
		const line = item.kind === "content" || item.kind === "heading" || item.kind === "symbol" ? item.line : null;
		if (line === null) return;
		const file = itemFile(item);
		if (!file || file.extension !== "md" || !(leaf.view instanceof MarkdownView)) return;
		const editor = leaf.view.editor;
		// Clamp to the live document: the stored 1-based line can point past EOF if
		// the file was trimmed after it was indexed, and a searcher could hand back
		// line 0 (→ -1 here). setCursor on an out-of-range position is unspecified.
		const targetLine = Math.max(0, Math.min(line - 1, editor.lastLine()));
		const pos = { line: targetLine, ch: 0 };
		editor.setCursor(pos);
		editor.scrollIntoView({ from: pos, to: pos }, true);
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

	openActionPalette(context: ResultItem | null = this.host.selectedItem()): void {
		if (!context || context.kind === "action" || context.kind === "history" || context.kind === "create" || context.kind === "quickaction") return;
		this._actionContext = context;
		this._actionReturnQuery = this.host.inputValue();
		this._actionReturnMode = this._mode;
		this.resultSnapshot = this.host.searchItems();
		this.host.setQuery("");
		this.host.focusInput();
		this.host.runSearch();
	}

	closeActionPalette(): void {
		if (!this._actionContext) return;
		this._actionContext = null;
		this.host.setQuery(this._actionReturnQuery);
		this._mode = this._actionReturnMode;
		this.host.focusInput();
		this.host.runSearch();
	}

	private installedSearchIntegrations(): SearchIntegrations {
		const plugins = (this.app as unknown as { plugins?: { plugins?: Record<string, unknown> } }).plugins?.plugins ?? {};
		return detectSearchIntegrations(Object.keys(plugins));
	}

	private runIntegrationCommand(name: string): void {
		const command = this.host.commandSearcher.search(name, 20).find((cmd) => cmd.id.toLowerCase().includes(name.replace(" ", "-")) || cmd.name.toLowerCase().includes(name));
		if (!command || !this.host.commandSearcher.execute(command.id)) {
			new Notice(`Vault Spotlight: ${name} command not found.`);
			return;
		}
		this.host.close();
	}

	private basesPowerPackApi(): {
		openView?: (view: string, basePath?: string) => Promise<boolean>;
		isPremiumActive?: () => boolean;
	} | null {
		const api = (
			window as unknown as {
				basesPowerPack?: {
					openView?: (view: string, basePath?: string) => Promise<boolean>;
					isPremiumActive?: () => boolean;
				};
			}
		).basesPowerPack;
		return api ?? null;
	}

	/** Open a .base result in a Bases Power Pack view via its public API. */
	private async handoffBaseToPowerPack(
		view: string,
		basePath: string
	): Promise<void> {
		const api = this.basesPowerPackApi();
		if (!api?.openView) {
			new Notice("Vault Spotlight: update Bases Power Pack to 1.2.0+ to use this action.");
			return;
		}
		try {
			// Power Pack does its own premium gating and shows its own notices;
			// only close Spotlight when the view actually opened.
			if (await api.openView(view, basePath)) this.host.close();
		} catch (err) {
			console.error("[VaultSpotlight] Bases Power Pack handoff failed", err);
			new Notice("Vault Spotlight: could not open the base in Bases Power Pack.");
		}
	}

	availableActions(context: ResultItem): SpotlightAction[] {
		return buildAvailableActions(context, this.actionHost());
	}

	/** The operations the action-palette `run` closures need — see actionBuilders.ts. */
	private actionHost(): ActionHost {
		return {
			app: this.app,
			plugin: this.plugin,
			workflows: this.host.workflows,
			capture: this.host.capture,
			integrations: () => this.installedSearchIntegrations(),
			basesPowerPackViews: (file) => this.basesPowerPackViews(file),
			handoffBaseToPowerPack: (view, path) => void this.handoffBaseToPowerPack(view, path),
			batchContext: () => this.batchContext(),
			resultItemsForBatch: () => this.resultItemsForBatch(),
			runIntegrationCommand: (name) => this.runIntegrationCommand(name),
			openResultAndClose: async (ctx) => {
				this.host.close();
				await this.openItem(ctx, null);
				const file = itemFile(ctx);
				if (file) this.plugin.trackRecent(file.path);
			},
			runCollectionQuery: (query) => {
				this._actionContext = null;
				this.host.setQuery(query);
				this.host.runSearch();
			},
			closeActionPalette: () => this.closeActionPalette(),
		};
	}

	/** Bases Power Pack views for a `.base` file — empty unless Power Pack premium is
	 * active, so the palette never offers a handoff that can only fail. */
	private basesPowerPackViews(file: TFile): ReadonlyArray<readonly [string, string]> {
		if (file.extension !== "base" || !this.installedSearchIntegrations().basesPowerPack) return [];
		const api = this.basesPowerPackApi();
		if (api?.openView && api.isPremiumActive?.() === true) {
			return [
				["kanban", "Kanban"],
				["calendar", "Calendar"],
				["gantt", "Gantt"],
			];
		}
		return [];
	}

	resultItemsForBatch(): ResultItem[] {
		const allItems = this._actionContext ? this.resultSnapshot : this.host.searchItems();
		const checked = allItems.filter((item) => {
			const file = itemFile(item);
			return file ? this.host.checkedPaths().has(file.path) : false;
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
			exportQuery: () => this._actionReturnQuery || this.host.inputValue(),
			close: () => this.host.close(),
			runSearch: () => this.host.runSearch(),
			closeActionPalette: () => this.closeActionPalette(),
		};
	}

	openActionsMenu(item: ResultItem, evt?: MouseEvent): void {
		openResultContextMenu(item, evt, {
			app: this.app,
			close: () => this.host.close(),
			trackRecent: (path) => this.plugin.trackRecent(path),
			seekToItemLine: (leaf, it) => this.seekToItemLine(leaf, it),
			selectedRowRect: () => this.host.selectedRowRect(),
		});
	}
}
