import {
	App,
	type EventRef,
	MarkdownView,
	Menu,
	Notice,
	Modal,
	Platform,
	TFile,
	TFolder,
	type WorkspaceLeaf,
	moment,
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
import { clampIndex, nextSelectedIndex } from "../core/selectionReducer.mjs";
import { resolveOpenTargets } from "../core/activationIntent.mjs";
import { expandSearchAlias } from "../core/searchAliases.mjs";
import { showOnboarding } from "../core/onboarding.mjs";
import { fuzzyMatch, tokenizeQuery } from "../search/fuzzy";
import { getVaultFileKind } from "../search/vaultFiles";
import { activeProfile, type CoreSearchProfile } from "../core/searchProfiles.mjs";
import { ensureStarterWorkflows, normalizeWorkflowPresets, FREE_WORKFLOW_LIMIT, type WorkflowPreset } from "../core/workflowPresets.mjs";
import { detectSearchIntegrations, type SearchIntegrations } from "../core/integrations.mjs";
import { findBacklinks, findOutlinks } from "../core/linkGraph.mjs";
import { evaluateExpression, parseCurrencyRates } from "../core/calculator.mjs";
import { parseNaturalDate } from "../core/naturalDates.mjs";
import {
	describeCaptureTarget,
	cycleMode as cycleModeHelper,
	getDrillPrefixMatch,
	getModifierLabel,
	getPreviewFocusText,
	getShortcutHints,
} from "../core/modalCopy.mjs";
import {
	itemFile,
	type PaneTarget,
	type ResultItem,
	type SpotlightAction,
	type SpotlightMode,
} from "./resultTypes";
import { PreviewPane } from "./PreviewPane";
import { CaptureController } from "./CaptureController";
import { WorkflowController } from "./WorkflowController";
import { renderResultRow } from "./resultRow";
import * as batchOps from "./batchOps";
import { copyToClipboard, renameFile } from "./batchOps";
import { DEFAULT_SETTINGS, createExternalLink } from "../settings";


// Re-exported so existing importers keep working after the types moved to
// resultTypes.ts.
export { MODE_ORDER, type SpotlightMode } from "./resultTypes";

/**
 * Obsidian re-exports `moment` via `import * as Moment` — under tsconfigs with
 * `esModuleInterop` on (the Obsidian sample default) that namespace import loses
 * its call signature, so `moment(...)` degrades to `any` and trips the review's
 * no-unsafe-* rules. Pin a minimal callable view (we only ever format) so the
 * call sites stay typed regardless of interop settings. Behavior is unchanged.
 */
const formatMoment = moment as unknown as (input?: number) => { format(fmt?: string): string };

// Keystroke → search debounce.
const SEARCH_DEBOUNCE_MS = 60;
// Per-mode result caps. The modal only renders ~50-60 rows, so these bound the
// work; named here rather than repeated as magic numbers across the mode branches.
const RESULT_LIMIT = 60; // commands, headings, editors, folders, links, snippets
const FILE_QUERY_LIMIT = 50; // files with a text query
const FILE_BROWSE_LIMIT = 40; // files, empty query (browse recents/all)
const SYMBOL_LIMIT = 100; // symbol outline of the active note
const COMMAND_BROWSE_LIMIT = 1000; // empty command query: rank the whole palette before slicing

export class SpotlightModal extends Modal {
	private inputEl!: HTMLInputElement;
	private resultsEl!: HTMLDivElement;
	private bodyEl!: HTMLDivElement;
	private preview: PreviewPane;
	private capture: CaptureController;
	private workflows: WorkflowController;
	private footerEl!: HTMLDivElement;
	private shortcutsEl!: HTMLDivElement;
	private statusEl!: HTMLSpanElement;
	private modeBadgeEl!: HTMLSpanElement;
	private hintEl!: HTMLDivElement;
	private items: ResultItem[] = [];
	private selectedIndex = 0;
	// The row index currently carrying is-selected in the DOM, so a selection move
	// only restyles the two affected rows instead of all of them. -1 whenever the
	// list holds no real rows (empty/loading/skeletons).
	private renderedSelectedIndex = -1;
	// Signature of the last footer we built (selected kind + has-file). The shortcut
	// chips depend only on these, so an unchanged signature skips the full
	// teardown/rebuild on every arrow keypress.
	private footerSig = "";
	private checkedPaths = new Set<string>();
	private searchTimer: number | null = null;
	private loadingTimer: number | null = null;
	private drillPrefixTimer: number | null = null;
	private searchGeneration = 0;
	private isLoading = false;
	// Suppresses mouseenter-driven selection while the keyboard is driving the
	// list, so programmatic scroll sliding rows under a stationary cursor can't
	// yank the selection sideways. Cleared by a real pointer move.
	private suppressHoverSelect = false;
	// Set by the background metadata listener so a passive re-index preserves the
	// user's place instead of snapping the selection back to the top.
	private preserveSelection = false;
	// Select the seeded query on first focus so the first keystroke replaces it.
	private pendingSelectAll = false;

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

	// explore that file without opening it. Escape restores the outer search.
	private drillFile: TFile | null = null;
	private drillReturnQuery = "";
	private drillReturnMode: SpotlightMode = "files";
	private hasNavigated = false;
	private activeWorkflowId = "";
	// Platform modifier label ("Cmd" on macOS, else "Ctrl"), resolved once in
	// onOpen so the footer hints match the real Mod-key bindings and the hint bar.
	private modifierLabel = "Ctrl";

	constructor(
		app: App,
		private plugin: VaultSpotlightPlugin,
		initialQuery = "",
		initialMode: SpotlightMode = "files"
	) {
		super(app);
		this.shouldRestoreSelection = false;
		this.preview = new PreviewPane(app);
		// Delight-action side effects (daily notes, capture, snippets, calc) live in
		// their own controller behind a tiny host (the batchOps pattern).
		this.capture = new CaptureController({
			app,
			plugin: this.plugin,
			close: () => this.close(),
			recordSearch: () => this.recordSearch(),
		});
		// Profile / workflow / custom-search save + apply, behind accessors so the
		// modal keeps ownership of the live mode/query/actionContext state.
		this.workflows = new WorkflowController({
			app,
			plugin: this.plugin,
			liveMode: () => this.mode,
			liveQuery: () => this.inputEl.value,
			hasActionContext: () => this.actionContext !== null,
			actionReturnMode: () => this.actionReturnMode,
			actionReturnQuery: () => this.actionReturnQuery,
			clearActionContext: () => {
				this.actionContext = null;
			},
			setMode: (mode) => {
				this.mode = mode;
			},
			setQuery: (query) => {
				this.inputEl.value = query;
			},
			setActiveWorkflowId: (id) => {
				this.activeWorkflowId = id;
			},
			currentProfileRankingMode: () => this.currentProfile()?.rankingMode,
			focusInput: () => this.focusInput(),
			runSearch: () => void this.runSearch(),
			closeActionPalette: () => this.closeActionPalette(),
		});
		this.fileSearcher = new FileSearcher(app);
		this.headingSearcher = new HeadingSearcher(app);
		this.commandSearcher = new CommandSearcher(app);
		this.symbolSearcher = new SymbolSearcher(app);
		this.editorSearcher = new EditorSearcher(app);
		this.initialQuery = initialQuery;
		this.mode = initialMode;
	}

	onOpen(): void {
		// Obsidian's Platform API instead of navigator.* for OS detection (per the
		// community review guidelines and popout-window safety).
		this.modifierLabel = getModifierLabel(Platform.isMacOS || Platform.isIosApp ? "mac" : "");
		this.containerEl.addClass("vault-spotlight-container");
		this.titleEl.empty();
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("vault-spotlight-modal");

		const header = contentEl.createDiv({ cls: "vault-spotlight-header" });
		const titleRow = header.createDiv({ cls: "vault-spotlight-title-row" });
		titleRow.createDiv({ cls: "vault-spotlight-title", text: "Vault Spotlight" });
		// Polite live region so cycling modes (Tab) is announced to screen readers
		// as the badge text changes (Files → Commands → Content …).
		this.modeBadgeEl = titleRow.createSpan({
			cls: "vault-spotlight-mode-badge",
			text: "Files",
			attr: { "aria-live": "polite" },
		});

		const inputWrap = header.createDiv({ cls: "vault-spotlight-input-wrap" });
		const searchIcon = inputWrap.createSpan({ cls: "vault-spotlight-search-icon" });
		setIcon(searchIcon, "search");
		searchIcon.setAttr("aria-hidden", "true");

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
		this.pendingSelectAll = this.initialQuery.length > 0;

		this.hintEl = header.createDiv({ cls: "vault-spotlight-hint" });
		this.updateHint();

		const body = contentEl.createDiv({ cls: "vault-spotlight-body" });
		this.bodyEl = body;
		this.resultsEl = body.createDiv({
			cls: "vault-spotlight-results",
			attr: {
				role: "listbox",
				id: "vault-spotlight-listbox",
				"aria-label": "Search results",
				"aria-multiselectable": this.plugin.settings.isPro ? "true" : "false",
			},
		});
		// A real pointer move re-enables hover selection; keyboard navigation and
		// the programmatic scroll it triggers do not fire mousemove, so the cursor
		// resting over the list can't hijack the keyboard selection.
		this.resultsEl.addEventListener("mousemove", () => {
			this.suppressHoverSelect = false;
		});
		// Row interactions are delegated to the list once here, rather than
		// re-binding four closures per row on every keystroke's full rebuild.
		this.resultsEl.addEventListener("mouseover", (evt) => {
			// Ignore hover selection triggered by rows sliding under a stationary
			// cursor during keyboard navigation; only honour a real pointer move.
			if (this.suppressHoverSelect) return;
			const index = this.rowIndexFromEvent(evt);
			if (index === null || index === this.selectedIndex) return;
			this.selectedIndex = index;
			this.updateSelectionHighlight();
		});
		// The star toggle stays on mousedown: it must preventDefault to keep focus in
		// the input (a re-search would reset the selection and scroll to the top,
		// losing the user's place mid-list).
		this.resultsEl.addEventListener("mousedown", (evt) => {
			const starBtn = (evt.target as HTMLElement).closest<HTMLElement>(".vault-spotlight-star-btn");
			if (!starBtn) return;
			const index = this.rowIndexFromEvent(evt);
			if (index === null) return;
			const item = this.items[index];
			evt.preventDefault();
			evt.stopPropagation();
			if (item?.kind === "file") {
				item.isStarred = this.plugin.toggleStar(item.file.path);
				setIcon(starBtn, item.isStarred ? "star" : "star-off");
				const row = starBtn.closest<HTMLElement>(".vault-spotlight-item");
				row?.toggleClass("is-starred", item.isStarred);
			}
		});
		// Activation runs on CLICK, not mousedown, so a touch scroll-drag that starts
		// on a row doesn't activate it (and close the modal) before the finger lifts —
		// a click never fires after a scroll gesture. Star clicks were handled on
		// mousedown above and are ignored here.
		this.resultsEl.addEventListener("click", (evt) => {
			if ((evt.target as HTMLElement).closest(".vault-spotlight-star-btn")) return;
			const index = this.rowIndexFromEvent(evt);
			if (index === null) return;
			this.selectedIndex = index;
			this.safeActivate();
		});
		this.resultsEl.addEventListener("contextmenu", (evt) => {
			const index = this.rowIndexFromEvent(evt);
			if (index === null) return;
			const item = this.items[index];
			// The menu only opens for rows backed by a file (same gate the footer
			// chip uses), so a right-click elsewhere falls through to the default.
			if (!item || !itemFile(item)) return;
			evt.preventDefault();
			this.selectedIndex = index;
			this.updateSelectionHighlight();
			this.openActionsMenu(item, evt);
		});
		this.renderLoading();

		this.syncPreviewMount();

		this.footerEl = contentEl.createDiv({ cls: "vault-spotlight-footer" });
		// The shortcut chips are rebuilt per selection, but the aria-live status
		// node is created ONCE and kept stable — assistive tech only announces
		// mutations to a live region that already existed in the a11y tree, so
		// recreating it on every keystroke would swallow "N results"/"N selected".
		this.shortcutsEl = this.footerEl.createDiv({ cls: "vault-spotlight-shortcuts" });
		this.statusEl = this.footerEl.createSpan({
			cls: "vault-spotlight-status",
			attr: { role: "status", "aria-live": "polite" },
		});
		this.renderFooter();

		if (!this.plugin.settings.isPro) {
			const cta = contentEl.createDiv({ cls: "vault-spotlight-pro-cta" });
			const lead = cta.createDiv({ cls: "vault-spotlight-pro-cta-lead" });
			const ctaIcon = lead.createDiv({ cls: "vault-spotlight-pro-cta-icon" });
			setIcon(ctaIcon, "sparkles");
			ctaIcon.setAttr("aria-hidden", "true");
			lead.createDiv({
				cls: "vault-spotlight-pro-cta-text",
				text: "Unlock content, heading & link search, live preview, snippets, saved workflows, and batch actions.",
			});
			createExternalLink(cta, {
				cls: "vault-spotlight-pro-btn",
				text: "Get Pro",
				url: this.plugin.settings.purchaseUrl,
				fallback: DEFAULT_SETTINGS.purchaseUrl,
			});
		}

		this.inputEl.addEventListener("input", (evt) => {
			// Never run drill-in logic mid-IME-composition: an intermediate CJK
			// candidate that transiently equals a mode prefix would otherwise clear the
			// input and drill/redirect, discarding the in-progress text. Defer to the
			// same composition the scope-key handlers already respect, and just search
			// the interim value. The committing input event (isComposing false) runs the
			// normal path below.
			if ((evt as InputEvent).isComposing) {
				this.hasNavigated = false;
				this.activeWorkflowId = "";
				this.scheduleSearch();
				return;
			}
			const item = this.items[this.selectedIndex];
			const file = item ? itemFile(item) : null;
			const drill = getDrillPrefixMatch(this.inputEl.value, this.plugin.settings.modePrefixes);
			if (this.drillPrefixTimer !== null) {
				window.clearTimeout(this.drillPrefixTimer);
				this.drillPrefixTimer = null;
			}
			if (this.hasNavigated && drill.mode && file?.extension === "md") {
				this.inputEl.value = "";
				this.drillInto(file, drill.mode);
				return;
			}
			if (this.hasNavigated && drill.pending) {
				this.drillPrefixTimer = window.setTimeout(() => {
					this.drillPrefixTimer = null;
					this.hasNavigated = false;
					this.scheduleSearch();
				}, 260);
				return;
			}
			this.hasNavigated = false;
			this.activeWorkflowId = "";
			this.scheduleSearch();
		});

		this.registerScopeShortcuts();

		// Modal is not a Component, so it has no registerEvent(); track the ref
		// ourselves and release it in onClose().
		this.metadataRef = this.app.metadataCache.on("resolved", () => {
			if (this.hasMetadataFilters()) {
				// A passive index refresh must not move the user's place.
				this.preserveSelection = true;
				this.scheduleSearch();
			}
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
		// The drill-prefix timer fires scheduleSearch() 260ms later; if left armed
		// it would run a full search against the now-detached modal (and re-arm
		// untracked timers), so release it alongside the others.
		if (this.drillPrefixTimer !== null) {
			window.clearTimeout(this.drillPrefixTimer);
			this.drillPrefixTimer = null;
		}
		this.clearFocusTimers();
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

	private currentProfile(): CoreSearchProfile | null {
		if (!this.plugin.settings.isPro) return null;
		return activeProfile(this.plugin.settings.searchProfiles, this.plugin.settings.activeProfileId);
	}

	private currentWorkflow(): WorkflowPreset | null {
		return this.plugin.settings.workflowPresets.find((workflow) => workflow.id === this.activeWorkflowId) ?? null;
	}

	/**
	 * Trigger cheatsheet: every mode prefix stays visible in the modal so the
	 * mode system is discoverable without reading docs (the top complaint
	 * about comparable switcher plugins).
	 */
	private updateHint(): void {
		const isPro = this.plugin.settings.isPro;
		const prefixes = this.plugin.settings.modePrefixes;
		const mod = this.modifierLabel;
		this.hintEl.empty();
		// New users get the full trigger cheatsheet; once they've opened the launcher
		// enough times, condense it to the essentials so the header isn't perpetually
		// dense. showOnboarding is pure + unit-tested in core/onboarding.
		const full = showOnboarding(this.plugin.settings.openCount, this.plugin.settings.onboardingDismissed);
		// The two persistent affordances are the core pillars — Actions (Cmd/Ctrl+K)
		// and Workflows (Cmd/Ctrl+S) — so post-onboarding hints emphasize those over
		// niche mode triggers. Both work on every tier.
		const core: Array<[string, string]> = [
			[`${mod}+K`, "actions"],
			[`${mod}+S`, "save workflow"],
		];
		const hints: Array<[string, string]> = full
			? [
					...core,
					["2+2", "calc"],
					[prefixes.capture, "capture"],
					["#journal", "tag"],
					[prefixes.commands, "commands"],
					[prefixes.symbols, "outline"],
					[prefixes.editors, "tabs"],
					[prefixes.folders, "folders"],
			  ]
			: [...core];
		if (isPro && full) {
			hints.push(
				[prefixes.content, "content"],
				[prefixes.headings, "headings"],
				[prefixes.links, "links"],
				[prefixes.snippets, "snippets"]
			);
		}
		hints.push(["Tab", "next mode"], ["Shift+Tab", "previous mode"]);
		// The literal-escape hint is niche; only surface it during first-run onboarding.
		if (full) hints.push([this.plugin.settings.escapeChar, "literal"]);
		hints.forEach(([code, label], index) => {
			if (index > 0) this.hintEl.appendText(" · ");
			this.hintEl.createEl("code", { text: code });
			this.hintEl.appendText(` ${label}`);
		});
		if (isPro) {
			this.hintEl.appendText(" · ");
			this.hintEl.createEl("code", { text: `${mod}+D` });
			this.hintEl.appendText(" star");
		}
		if (this.plugin.settings.workflowPresets.length === 0) {
			this.hintEl.appendText(" · starter workflows in Browse");
		}
	}

	private hasMetadataFilters(): boolean {
		const parsed = tokenizeQuery(this.inputEl?.value ?? "");
		return parsed.tags.length > 0 || parsed.properties.length > 0;
	}

	private expandAliases(raw: string): string {
		return expandSearchAlias(raw, {
			isPro: this.plugin.settings.isPro,
			aliases: this.plugin.settings.searchAliases,
		});
	}

	private scheduleSearch(): void {
		if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
		this.searchTimer = window.setTimeout(() => void this.runSearch(), SEARCH_DEBOUNCE_MS);
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
		if (detected.mode) return { mode: detected.mode, body: detected.body };
		return { mode: this.mode, body: raw.trim() };
	}

	private async runSearch(): Promise<void> {
		const generation = ++this.searchGeneration;
		// If this run should keep the user's place (a background re-index), record
		// the selected row's identity so it can be re-found after the rebuild.
		const preservedKey = this.preserveSelection ? this.itemKey(this.items[this.selectedIndex]) : null;
		this.preserveSelection = false;
		const raw = this.expandAliases(this.inputEl.value);
		const trimmed = raw.trim();
		const { mode, body } = this.resolveQuery(raw);
		const isEmptyQuery = body.length === 0;
		const isPro = this.plugin.settings.isPro;
		const profile = this.currentProfile();
		const workflow = this.currentWorkflow();
		const excludeFolders = profile?.excludeFolders ?? this.plugin.settings.excludeFolders;
		const includeCanvas = profile?.includeCanvas ?? this.plugin.settings.includeCanvas;
		const includePdf = profile?.includePdf ?? this.plugin.settings.includePdf;
		const includeBases = profile?.includeBases ?? this.plugin.settings.includeBases;

		this.isLoading = true;

		// results (the common case) render directly, without a flash.
		if (this.loadingTimer !== null) window.clearTimeout(this.loadingTimer);
		this.loadingTimer = window.setTimeout(() => {
			this.loadingTimer = null;
			if (!this.isLoading) return;
			// On a re-query, keep the previous rows on screen and just dim them —
			// tearing the list down to skeletons on every keystroke loses the
			// user's context and place. Skeletons are only for the first render.
			if (this.resultsEl.querySelector(".vault-spotlight-item") === null) {
				this.renderLoading();
			} else {
				this.resultsEl.addClass("is-searching");
			}
		}, 100);

		if (this.actionContext) {
			// This branch sits outside the main try/catch below, so guard it on its
			// own: a throw while building the action list must still tear the loading
			// state down (in a finally) or the skeleton spinner would be stranded.
			try {
				const actions = this.availableActions(this.actionContext);
				const query = trimmed.toLowerCase();
				this.setBadge("Actions", "is-content");
				this.items = actions
					.filter((action) => !query || `${action.name} ${action.description}`.toLowerCase().includes(query))
					.map((action) => ({ kind: "action" as const, action }));
				this.selectedIndex = 0;
				this.renderResults();
				this.updateStatus(this.items.length);
			} catch (err) {
				console.error("[VaultSpotlight] action palette failed", err);
				this.items = [];
				this.renderEmptyState("alert-triangle", "Couldn't build actions", "Something went wrong. Press Escape to go back.");
				this.updateStatus(0);
			} finally {
				this.isLoading = false;
				if (this.loadingTimer !== null) {
					window.clearTimeout(this.loadingTimer);
					this.loadingTimer = null;
				}
			}
			return;
		}

		try {
			if ((mode === "content" || mode === "headings" || mode === "links" || mode === "snippets") && !isPro) {
				this.setBadge("Pro", "is-pro");
				this.items = [];
				this.isLoading = false;
				this.renderEmptyState(
					"lock",
					mode === "content" ? "Content search is a Pro feature" : mode === "headings" ? "Heading jump is a Pro feature" : mode === "snippets" ? "Snippets are a Pro feature" : "Links mode is a Pro feature",
					mode === "content"
						? "Search inside note bodies with queries like > meeting notes."
						: mode === "headings"
							? "Jump straight to any heading across your vault."
							: mode === "snippets"
								? "Insert reusable text snippets with date, time, clipboard, and cursor placeholders."
								: "Browse backlinks and outlinks for the active note or a matching note."
				);
				this.updateStatus(0);
				return;
			}

			if (mode === "commands") {
				const cmdQuery = body;
				this.setBadge("Commands", "is-content");
				// Empty query: resurface recently-run commands first, then the rest.
				const commandResults = this.commandSearcher.search(cmdQuery, cmdQuery ? RESULT_LIMIT : COMMAND_BROWSE_LIMIT, this.plugin.settings.ranking.ignoreDiacritics);
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
				this.items = ordered.slice(0, RESULT_LIMIT).map((r) => ({
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
							"Type to search inside your notes — every word must appear on the same line. Recent searches appear here."
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
					matchIndices: r.matchIndices ?? [],
				}));
			} else if (mode === "headings") {
				this.setBadge("Headings", "is-content");
				// Supports `file#heading` scoping and `level:1-2` depth filters.
				const parsed = parseHeadingQuery(body);
				const headingResults = this.headingSearcher.search(parsed.headingQuery, {
					excludeFolders,
					limit: RESULT_LIMIT,
					fileQuery: parsed.fileQuery,
					levelMin: parsed.levelMin,
					levelMax: parsed.levelMax,
					ignoreDiacritics: this.plugin.settings.ranking.ignoreDiacritics,
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
				const symbolResults = this.symbolSearcher.search(target, body, SYMBOL_LIMIT, this.plugin.settings.ranking.ignoreDiacritics);
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
				const editorResults = this.editorSearcher.search(body, RESULT_LIMIT, this.plugin.settings.ranking.ignoreDiacritics);
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
			} else if (mode === "capture") {
				this.setBadge("Capture", "is-content");
				this.items = this.captureItems(body);
			} else if (mode === "snippets") {
				this.setBadge("Snippets", "is-content");
				this.items = this.snippetItems(body);
				if (this.items.length === 0) {
					this.isLoading = false;
					const hasSnippets = this.plugin.settings.snippets.length > 0;
					this.renderEmptyState(
						"clipboard-type",
						hasSnippets ? "No matching snippets" : "No snippets yet",
						hasSnippets
							? "Try a different snippet name."
							: "Add reusable snippets in Settings → Vault Spotlight, then insert them here."
					);
					this.updateStatus(0);
					return;
				}
			} else {
				this.setBadge(isEmptyQuery ? "Browse" : "Files", null);
				const parsed = tokenizeQuery(body);
				const fileResults = this.fileSearcher.search({
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
					ranking: this.plugin.settings.ranking,
					rankingMode: workflow?.rankingMode ?? profile?.rankingMode,
					limit: isEmptyQuery ? FILE_BROWSE_LIMIT : FILE_QUERY_LIMIT,
				});

				this.items = fileResults.map((r) => ({
					kind: "file" as const,
					file: r.file,
					score: r.score,
					matchIndices: r.matchIndices,
					modifiedLabel: r.modifiedLabel,
					fileKind: r.fileKind,
					primaryMatch: r.primaryMatch,
					aliasMatched: r.aliasMatched,
					tags: r.tags,
					aliases: r.aliases,
					isRecent: r.isRecent,
					isStarred: r.isStarred,
					isBookmarked: r.isBookmarked,
				}));

				if (isEmptyQuery) {
					// Saved objects sit above the file list, most-canonical first:
					// Workflows (the primary saved object) on TOP, then advanced Search
					// profiles, then the legacy "Smart collections" (retired custom
					// searches) at the bottom. Prepend once in that order so the hierarchy
					// is explicit rather than an artifact of three reversed prepends.

					// Workflows are free up to FREE_WORKFLOW_LIMIT so users can feel the
					// recurring-workflow benefit before upgrading. Pro is unlimited and
					// gets the curated starter presets seeded when it has none of its own.
					const workflowSource = isPro
						? ensureStarterWorkflows(this.plugin.settings.workflowPresets)
						: normalizeWorkflowPresets(this.plugin.settings.workflowPresets).slice(0, FREE_WORKFLOW_LIMIT);
					const workflowItems = workflowSource
						.slice()
						.sort((a, b) => Number(b.pinned) - Number(a.pinned) || Number(b.starter ?? false) - Number(a.starter ?? false) || a.name.localeCompare(b.name))
						.map((workflow) => ({
							kind: "workflow" as const,
							id: workflow.id,
							name: workflow.name,
							query: workflow.query,
							mode: workflow.mode,
							profileId: workflow.profileId,
							isPinned: workflow.pinned,
							isStarter: workflow.starter ?? false,
							rankingMode: workflow.rankingMode,
						}));

					const profileItems =
						isPro && this.plugin.settings.searchProfiles.length > 0
							? this.plugin.settings.searchProfiles.map((searchProfile) => ({
									kind: "profile" as const,
									id: searchProfile.id,
									name: searchProfile.name,
									defaultMode: searchProfile.defaultMode,
									defaultQuery: searchProfile.defaultQuery,
									isActive: searchProfile.id === this.plugin.settings.activeProfileId,
								}))
							: [];

					let collectionItems: Array<{ kind: "collection"; id: string; name: string; query: string; isPinned: boolean }> = [];
					if (isPro && this.plugin.settings.customSearches.length > 0) {
						const pinned = new Set(this.plugin.settings.pinnedCustomSearchIds);
						collectionItems = this.plugin.settings.customSearches
							.slice()
							.sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)) || a.name.localeCompare(b.name))
							.map((search) => ({
								kind: "collection" as const,
								id: search.id,
								name: search.name,
								query: search.query,
								isPinned: pinned.has(search.id),
							}));
					}

					this.items = [...workflowItems, ...profileItems, ...collectionItems, ...this.items];
				}

				// Ambient calculator / date-jump: when the query is a calculation or
				// a natural-language date, surface a result row above the file list.
				// Free — it's the top-of-funnel "wait, it does that?" moment.
				if (!isEmptyQuery) {
					const smartItems = this.computeSmartItems(body);
					if (smartItems.length > 0) this.items = [...smartItems, ...this.items];
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
		if (preservedKey) {
			const restored = this.items.findIndex((item) => this.itemKey(item) === preservedKey);
			this.selectedIndex = restored >= 0 ? restored : 0;
		} else {
			this.selectedIndex = 0;
		}
		this.renderResults();
		this.updateStatus(this.items.length);
		this.updatePreview();
	}

	/** Stable identity for a result row, used to preserve selection across a
	 * passive re-render. Only file-backed rows have one; others return null. */
	private itemKey(item: ResultItem | undefined): string | null {
		if (!item) return null;
		const file = itemFile(item);
		if (!file) return null;
		const line = "line" in item ? `:${item.line}` : "";
		return `${item.kind}:${file.path}${line}`;
	}

	private setBadge(text: string, cls: "is-content" | "is-pro" | null): void {
		this.modeBadgeEl.setText(text);
		this.modeBadgeEl.removeClass("is-content");
		this.modeBadgeEl.removeClass("is-pro");
		if (cls) this.modeBadgeEl.addClass(cls);
	}

	private getBrowseSection(item: ResultItem): string | null {
		if (item.kind === "workflow" && this.inputEl.value.trim().length === 0) return "Workflows";
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
			primaryMatch: "browse",
			aliasMatched: false,
			tags: [],
			aliases: [],
			isRecent: this.plugin.settings.recentPaths.includes(file.path),
			isStarred: this.plugin.isStarred(file.path),
			isBookmarked: bookmarkedPaths.has(file.path),
		};
	}

	private linkModeItems(query: string): ResultItem[] {
		const active = this.app.workspace.getActiveFile();
		const files = this.app.vault.getMarkdownFiles();
		const q = query.replace(/^(<-|->|\[\[)\s?/, "").trim().toLowerCase();

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
		return linked.slice(0, RESULT_LIMIT).map((file, index) => this.fileToResult(file, 1000 - index, bookmarkedPaths));
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
		return rows.slice(0, RESULT_LIMIT).map((row) => ({
			kind: "folder" as const,
			folder: row.folder,
			matchIndices: row.indices,
		}));
	}

	// --- Delight layer: calculator, dates, capture, snippets -----------------

	private currencyRates(): Record<string, number> {
		return parseCurrencyRates(this.plugin.settings.currencyRates);
	}

	/**
	 * Ambient calculator / natural-language date rows for the files mode. Returns
	 * at most one row (a calculation takes precedence over a date), or none when
	 * the query is ordinary text — so plain searches are never intercepted.
	 */
	private computeSmartItems(body: string): ResultItem[] {
		const text = body.trim();
		if (!text) return [];
		// Dates are checked BEFORE the calculator so an ISO date like 2026-07-24
		// resolves to a daily-note jump instead of being evaluated as 2026-7-24.
		if (this.plugin.settings.enableDateJump) {
			const date = parseNaturalDate(text);
			if (date) {
				const { path, exists } = this.capture.resolveDatePath(date.date);
				return [{ kind: "datejump", date: date.date, label: date.label, path, exists }];
			}
		}
		if (this.plugin.settings.enableCalculator) {
			const calc = evaluateExpression(text, { rates: this.currencyRates() });
			if (calc) {
				const detail =
					calc.kind === "currency"
						? "Currency · your rates"
						: calc.kind === "unit"
							? "Unit conversion"
							: calc.kind === "temp"
								? "Temperature"
								: calc.kind === "percent"
									? "Percentage"
									: "Calculator";
				return [{ kind: "calc", expression: calc.expression, result: calc.formatted, detail }];
			}
		}
		return [];
	}

	private captureItems(body: string): ResultItem[] {
		const text = body.trim();
		const dailyName = formatMoment().format(this.capture.dailyNoteConfig().format);
		const captureHeading = this.plugin.settings.isPro ? this.plugin.settings.captureHeading : "";
		const captureMode = this.plugin.settings.isPro ? this.plugin.settings.captureMode : "append";
		const items: ResultItem[] = [
			{
				kind: "capture",
				text,
				target: "daily",
				label: "Daily note",
				description: describeCaptureTarget({
					hasText: text.length > 0,
					targetLabel: dailyName,
					mode: captureMode,
					heading: captureHeading,
				}),
			},
		];
		const inbox = this.plugin.settings.captureInboxPath.trim();
		if (this.plugin.settings.isPro && inbox) {
			items.push({
				kind: "capture",
				text,
				target: "inbox",
				label: "Inbox",
				description: describeCaptureTarget({
					hasText: text.length > 0,
					targetLabel: inbox,
					mode: captureMode,
					heading: captureHeading,
				}),
			});
		}
		return items;
	}

	private snippetItems(query: string): ResultItem[] {
		const q = query.trim().toLowerCase();
		const rows: Array<{ id: string; name: string; body: string; score: number; indices: number[] }> = [];
		for (const snippet of this.plugin.settings.snippets) {
			if (!q) {
				rows.push({ id: snippet.id, name: snippet.name, body: snippet.body, score: 1, indices: [] });
				continue;
			}
			const nameMatch = fuzzyMatch(q, snippet.name);
			const match = nameMatch ?? fuzzyMatch(q, snippet.body);
			if (!match) continue;
			rows.push({
				id: snippet.id,
				name: snippet.name,
				body: snippet.body,
				score: nameMatch ? match.score + 10 : match.score,
				indices: nameMatch ? nameMatch.indices : [],
			});
		}
		rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
		return rows.slice(0, RESULT_LIMIT).map((row) => ({
			kind: "snippet" as const,
			id: row.id,
			name: row.name,
			body: row.body,
			matchIndices: row.indices,
		}));
	}

	private renderLoading(): void {
		this.resultsEl.empty();
		this.renderedSelectedIndex = -1;
		this.resultsEl.addClass("vault-spotlight-loading");
		// Mirror the real row (icon tile + title line + meta line) so the swap to
		// loaded content is seamless rather than a visible jump.
		for (let i = 0; i < 5; i++) {
			const row = this.resultsEl.createDiv({ cls: "vault-spotlight-skeleton" });
			row.createDiv({ cls: "vault-spotlight-skeleton-icon" });
			const lines = row.createDiv({ cls: "vault-spotlight-skeleton-lines" });
			lines.createDiv({ cls: "vault-spotlight-skeleton-line is-title" });
			lines.createDiv({ cls: "vault-spotlight-skeleton-line is-meta" });
		}
	}

	private renderEmptyState(icon: string, title: string, desc: string): void {
		if (this.loadingTimer !== null) {
			window.clearTimeout(this.loadingTimer);
			this.loadingTimer = null;
		}
		this.resultsEl.empty();
		this.renderedSelectedIndex = -1;
		this.resultsEl.removeClass("vault-spotlight-loading");
		this.resultsEl.removeClass("is-searching");
		const empty = this.resultsEl.createDiv({ cls: "vault-spotlight-empty" });
		const iconWrap = empty.createDiv({ cls: "vault-spotlight-empty-icon" });
		setIcon(iconWrap, icon);
		iconWrap.setAttr("aria-hidden", "true");
		empty.createDiv({ cls: "vault-spotlight-empty-title", text: title });
		empty.createDiv({ cls: "vault-spotlight-empty-desc", text: desc });
		// An empty state means no selection: collapse the footer to its base chips
		// (otherwise it keeps advertising the previously-selected item's keys as dead
		// keys) and clear the Pro preview pane (otherwise it strands the prior note
		// beside a "nothing found" list). Both no-op via their own guards when
		// nothing actually changed / the preview isn't mounted.
		this.renderFooter();
		this.updatePreview();
	}

	private renderResults(): void {
		if (this.loadingTimer !== null) {
			window.clearTimeout(this.loadingTimer);
			this.loadingTimer = null;
		}
		this.resultsEl.empty();
		this.resultsEl.removeClass("vault-spotlight-loading");
		this.resultsEl.removeClass("is-searching");

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
			this.inputEl.removeAttribute("aria-activedescendant");
			return;
		}

		const isEmptyQuery = this.inputEl.value.trim().length === 0;
		let lastSection = "";

		this.items.forEach((item, index) => {
			const section = this.getBrowseSection(item);
			if (section && section !== lastSection) {
				// role=presentation: a listbox may only contain option (and group)
				// children, so a bare label div is exposed as presentational rather
				// than as a stray, roleless node inside the options.
				this.resultsEl.createDiv({ cls: "vault-spotlight-section-label", text: section, attr: { role: "presentation" } });
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
				check.setAttr("aria-hidden", "true");
				if (this.checkedPaths.has(file.path)) {
					setIcon(check, "check");
				}
			}

			renderResultRow(row, item, {
				isEmptyQuery,
				showModifiedTime: this.plugin.settings.showModifiedTime,
				showMatchReasons: this.plugin.settings.ranking.showMatchReasons,
			});

			if (this.plugin.settings.isPro && item.kind === "file") {
				const starItem = item;
				// A focusable/interactive descendant is invalid inside role=option, so
				// this stays a mouse-only affordance (tabindex -1, hidden from AT); the
				// keyboard/AT path to star is the Mod+D shortcut.
				const starBtn = row.createEl("button", {
					cls: "vault-spotlight-star-btn",
					attr: { type: "button", tabindex: "-1", "aria-hidden": "true" },
				});
				setIcon(starBtn, starItem.isStarred ? "star" : "star-off");
			}
			// Hover, click, star-toggle, and context-menu are handled by the
			// delegated listeners on resultsEl (see onOpen) — no per-row closures.
		});

		// The selected row was styled inline in the loop above; record it so the
		// next selection move only has to restyle it and its successor.
		this.renderedSelectedIndex = this.selectedIndex;

		// Point the combobox at the default (row-0) option now, so a screen reader
		// announces the pre-selected result on first render — not only after the
		// first arrow key.
		const selectedRow = this.resultsEl.querySelector<HTMLElement>(".is-selected");
		if (selectedRow?.id) this.inputEl.setAttribute("aria-activedescendant", selectedRow.id);
		else this.inputEl.removeAttribute("aria-activedescendant");
		// Keep a preserved mid-list selection visible after a full re-render (e.g. a
		// passive metadata "resolved" re-index restores a non-zero selectedIndex):
		// without this the selected row can sit scrolled off-screen until the next
		// arrow key. A fresh search resets to index 0, so this no-ops on the common
		// path (the list is already scrolled to top).
		if (this.selectedIndex > 0) selectedRow?.scrollIntoView({ block: "nearest" });

		// Refresh the footer for the freshly-selected row. renderFooter() was only
		// called on selection *moves*, so after a new search or a Tab mode switch the
		// chips described the previous item's kind (e.g. file chips on a command row)
		// until the first arrow press. The footerSig cache no-ops when unchanged.
		this.renderFooter();
	}

	/** Resolve the result index for a delegated list event, or null if off-row. */
	private rowIndexFromEvent(evt: Event): number | null {
		const row = (evt.target as HTMLElement).closest<HTMLElement>(".vault-spotlight-item");
		if (!row || !this.resultsEl.contains(row)) return null;
		const index = Number(row.dataset.index);
		return Number.isInteger(index) && index >= 0 && index < this.items.length ? index : null;
	}

	private applyRowState(row: HTMLElement, index: number): void {
		const selected = index === this.selectedIndex;
		row.toggleClass("is-selected", selected);
		row.setAttribute("aria-selected", String(selected));
		const item = this.items[index];
		const file = item ? itemFile(item) : null;
		if (file) {
			const checked = this.checkedPaths.has(file.path);
			row.toggleClass("is-checked", checked);
			// Expose per-row checked state so screen readers can tell which
			// individual rows are selected, not just an aggregate "N selected".
			if (this.plugin.settings.isPro) row.setAttribute("aria-checked", String(checked));
		}
	}

	private updateSelectionHighlight(): void {
		// Restyle only the row that lost selection and the one that gained it, not
		// every row — arrow-holding a long list otherwise did O(rows) DOM writes
		// plus a full footer rebuild and a forced reflow on every single step.
		const prev = this.renderedSelectedIndex;
		if (prev >= 0 && prev !== this.selectedIndex) {
			const prevRow = this.resultsEl.querySelector<HTMLElement>(`.vault-spotlight-item[data-index="${prev}"]`);
			if (prevRow) this.applyRowState(prevRow, prev);
		}
		const selected = this.resultsEl.querySelector<HTMLElement>(`.vault-spotlight-item[data-index="${this.selectedIndex}"]`);
		if (selected) this.applyRowState(selected, this.selectedIndex);
		this.renderedSelectedIndex = this.selectedIndex;

		selected?.scrollIntoView({ block: "nearest" });
		// Point the combobox at the active option for screen readers.
		if (selected?.id) this.inputEl.setAttribute("aria-activedescendant", selected.id);
		else this.inputEl.removeAttribute("aria-activedescendant");
		this.renderFooter();
		this.updateStatus(this.items.length);
		this.updatePreview();
	}

	private renderFooter(): void {
		const selected = this.items[this.selectedIndex] ?? null;
		// The chips are a pure function of the selected item's kind and whether it
		// is file-backed (the Alt+↵ menu chip); skip the rebuild when neither moved.
		const sig = `${selected?.kind ?? "none"}|${selected && itemFile(selected) ? "f" : ""}`;
		if (sig === this.footerSig) return;
		this.footerSig = sig;

		const shortcuts = this.shortcutsEl;
		shortcuts.empty();

		for (const hint of getShortcutHints({
			itemKind: selected?.kind ?? null,
			defaultNewTab: this.plugin.settings.defaultNewTab,
			isPro: this.plugin.settings.isPro,
			modifierLabel: this.modifierLabel,
		})) {
			this.addShortcut(shortcuts, hint.keys, hint.label);
		}
		// The context menu (Alt+Enter) only opens for rows backed by a file — gate
		// the chip on the same check the handler uses so it's never a dead key.
		if (selected && itemFile(selected)) this.addShortcut(shortcuts, ["Alt", "↵"], "menu");
	}

	private addShortcut(container: HTMLElement, keys: string[], label: string): void {
		const wrap = container.createSpan({ cls: "vault-spotlight-shortcut" });
		for (const key of keys) {
			wrap.createEl("kbd", { text: key });
		}
		wrap.appendText(` ${label}`);
	}

	/**
	 * Drop checked paths that are no longer among the visible results. The
	 * multi-select set is keyed by path and survives query changes; without this
	 * the footer would report "N selected" for files that have scrolled out of
	 * the result set, and a batch action (which falls back to "all results" when
	 * the checked intersection is empty) could silently mutate the WRONG files.
	 * Skipped while the action palette is open, where `items` holds actions, not
	 * results, and the checked set must survive into the batch operation.
	 */
	private pruneCheckedToVisible(): void {
		if (this.checkedPaths.size === 0) return;
		const visible = new Set<string>();
		for (const item of this.items) {
			const file = itemFile(item);
			if (file) visible.add(file.path);
		}
		for (const path of Array.from(this.checkedPaths)) {
			if (!visible.has(path)) this.checkedPaths.delete(path);
		}
	}

	private updateStatus(count: number): void {
		if (!this.actionContext) this.pruneCheckedToVisible();
		// Reflect real listbox state for assistive tech instead of a hardcoded
		// "expanded" — the combobox is only expanded when options are showing.
		this.inputEl?.setAttribute("aria-expanded", count > 0 ? "true" : "false");
		if (!this.statusEl) return;
		if (this.checkedPaths.size > 0) {
			this.statusEl.setText(`${this.checkedPaths.size} selected`);
			return;
		}
		if (count === 0) {
			// Announce the zero-results transition to assistive tech instead of
			// going silent — the aria-live region is the only cue a SR user gets.
			this.statusEl.setText("No results");
			return;
		}
		this.statusEl.setText(`${count} result${count === 1 ? "" : "s"}`);
	}

	private moveSelection(delta: number): void {
		// Clamp-at-ends navigation math lives in core/selectionReducer (unit-tested);
		// this method keeps the DOM side effects.
		this.setSelectedIndex(nextSelectedIndex(this.selectedIndex, this.items.length, { type: "move", delta }));
	}

	/** Number of fully-visible rows, for PageUp/PageDown jumps. */
	private pageSize(): number {
		const first = this.resultsEl.querySelector<HTMLElement>(".vault-spotlight-item");
		if (!first) return 8;
		const rowHeight = first.offsetHeight || 44;
		return Math.max(1, Math.floor(this.resultsEl.clientHeight / rowHeight));
	}

	private setSelectedIndex(index: number): void {
		if (this.items.length === 0) return;
		// Navigate over whatever rows are actually on screen. Gating on isLoading
		// froze the arrows during a slow ripgrep search even while the previous
		// results were still visible; only block when the list shows skeletons
		// (no real rows to move between).
		if (this.resultsEl.querySelector(".vault-spotlight-item") === null) return;
		this.selectedIndex = clampIndex(index, this.items.length);
		// A keyboard move must win over the cursor resting on the list until the
		// pointer actually moves again.
		this.suppressHoverSelect = true;
		// Arrowing onto a result arms drill-in: the next symbols/links trigger
		// keypress explores that result instead of typing into the query.
		this.hasNavigated = true;
		this.updateSelectionHighlight();
	}

	/** Shift+Enter: create a note named after the current query text. */
	private async createFromQuery(): Promise<void> {
		// For delight-layer rows, Shift+Enter does the useful thing instead of
		// creating a note titled "2+2" or the capture text.
		const selected = this.items[this.selectedIndex];
		if (selected?.kind === "calc") {
			this.capture.insertCalcResult(selected);
			return;
		}
		if (selected && (selected.kind === "capture" || selected.kind === "snippet" || selected.kind === "datejump")) {
			this.safeActivate();
			return;
		}
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
		// In-place update (see the row star button) so Ctrl+D on the 20th result
		// doesn't snap the list back to the top.
		item.isStarred = this.plugin.toggleStar(item.file.path);
		const row = this.resultsEl.querySelector<HTMLElement>(
			`.vault-spotlight-item[data-index="${this.selectedIndex}"]`
		);
		row?.toggleClass("is-starred", item.isStarred);
		const starBtn = row?.querySelector<HTMLElement>(".vault-spotlight-star-btn");
		if (starBtn) {
			setIcon(starBtn, item.isStarred ? "star" : "star-off");
			starBtn.setAttr("aria-label", item.isStarred ? "Unstar" : "Star");
		}
	}

	private cycleMode(direction: 1 | -1 = 1): void {
		// While the action palette is open, mode has no effect (results are actions),
		// so Tab must not silently mutate the underlying mode behind the palette.
		if (this.actionContext) return;
		this.mode = cycleModeHelper(this.mode, {
			isPro: this.plugin.settings.isPro,
			direction,
		});
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

	/**
	 * Fire-and-forget entry point for the Enter-key handlers and row clicks.
	 * activateSelection does post-close work (openFile, editor mutations, command
	 * exec, snippet insert) that can reject — e.g. an editors-mode leaf closed by
	 * sync between search and Enter, or a locked note. Because callers invoke it as
	 * `void`, an unguarded rejection would surface as an unhandled promise rejection
	 * with the modal already closed and nothing shown to the user. Contain it here.
	 */
	private safeActivate(paneOverride: PaneTarget = null): void {
		this.activateSelection(paneOverride).catch((err) => {
			console.error("[VaultSpotlight] activation failed", err);
			new Notice("Vault Spotlight: could not complete that action.");
		});
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
			this.workflows.activateProfile(selected.id);
			return;
		}

		if (selected.kind === "workflow") {
			this.workflows.applyWorkflow(selected.id);
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

		if (selected.kind === "calc") {
			this.capture.copyCalcResult(selected);
			return;
		}

		if (selected.kind === "datejump") {
			this.close();
			await this.capture.openOrCreateDatedNote(selected.date);
			return;
		}

		if (selected.kind === "capture") {
			await this.capture.runCapture(selected);
			return;
		}

		if (selected.kind === "snippet") {
			await this.capture.insertSnippet(selected);
			return;
		}

		// Opening a real result means the current query was useful — remember it.
		this.recordSearch();

		// Batch-vs-single target and pane resolution is pure and unit-tested in
		// core/activationIntent; the modal maps the decision back to items (to keep
		// each result's line for seekToItemLine) and performs the opens.
		const selectedFile = itemFile(selected);
		const decision = resolveOpenTargets({
			selectedPath: selectedFile ? selectedFile.path : null,
			checkedPaths: Array.from(this.checkedPaths),
			visiblePaths: this.items.map((i) => itemFile(i)?.path).filter((p): p is string => !!p),
			paneOverride,
			defaultNewTab: this.plugin.settings.defaultNewTab,
		});
		const targets: ResultItem[] = decision.isBatch
			? this.items.filter((i) => {
					const f = itemFile(i);
					return !!f && decision.paths.includes(f.path);
			  })
			: selectedFile
				? [selected]
				: [];

		this.checkedPaths.clear();
		this.close();

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

	private installedSearchIntegrations(): SearchIntegrations {
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
		view: "kanban" | "calendar" | "gantt",
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
			if (await api.openView(view, basePath)) this.close();
		} catch (err) {
			console.error("[VaultSpotlight] Bases Power Pack handoff failed", err);
			new Notice("Vault Spotlight: could not open the base in Bases Power Pack.");
		}
	}

	private availableActions(context: ResultItem): SpotlightAction[] {
		if (context.kind === "profile") {
			return [
				{
					id: "activate-profile",
					name: "Activate search profile",
					description: `Switch to ${context.name} and run its default query.`,
					requiresPro: true,
					run: () => this.workflows.activateProfile(context.id),
				},
				{
					id: "clear-profile",
					name: "Clear active profile",
					description: "Return Spotlight to the global search settings.",
					requiresPro: true,
					run: () => this.workflows.clearProfile(),
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

		// Delight rows get their own contextual actions instead of the generic
		// file-batch palette, which has nothing to do with a calc/date/snippet row.
		if (context.kind === "calc") {
			return [
				{
					id: "copy-calc",
					name: "Copy result",
					description: `Copy ${context.result} to the clipboard.`,
					run: () => this.capture.copyCalcResult(context),
				},
				{
					id: "insert-calc",
					name: "Insert at cursor",
					description: "Insert the result into the active note.",
					run: () => this.capture.insertCalcResult(context),
				},
			];
		}
		if (context.kind === "datejump") {
			return [
				{
					id: "open-daily",
					name: context.exists ? "Open daily note" : "Create daily note",
					description: context.path,
					run: () => void this.capture.openOrCreateDatedNote(context.date),
				},
			];
		}
		if (context.kind === "capture") {
			return [
				{
					id: "run-capture",
					name: "Capture",
					description: context.description,
					run: () => void this.capture.runCapture(context),
				},
			];
		}
		if (context.kind === "snippet") {
			return [
				{
					id: "insert-snippet",
					name: "Insert snippet",
					description: "Insert this snippet at the cursor.",
					requiresPro: true,
					run: () => void this.capture.insertSnippet(context),
				},
				{
					id: "copy-snippet",
					name: "Copy snippet",
					description: "Copy the snippet body to the clipboard.",
					run: () => copyToClipboard(context.body, "Snippet copied"),
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
					// Rename is free (a basic file operation) and available from both the
					// action palette and the right-click / Alt+Enter menu — the two paths
					// are intentionally consistent (the context menu never gated it).
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

		const integrations = this.installedSearchIntegrations();

		// Handoff: open a .base result in a Bases Power Pack view. Using a base
		// as the data source is a Power Pack PREMIUM feature — only offer the
		// actions when its API reports premium, so Lite users never see menu
		// items that can only fail.
		if (file && file.extension === "base" && integrations.basesPowerPack) {
			const api = this.basesPowerPackApi();
			if (api?.openView && api.isPremiumActive?.() === true) {
				const views = [
					["kanban", "Kanban"],
					["calendar", "Calendar"],
					["gantt", "Gantt"],
				] as const;
				for (const [view, label] of views) {
					actions.push({
						id: `open-base-${view}`,
						name: `Open in ${label} view`,
						description: `Open this base in Bases Power Pack's ${label} view.`,
						run: () => this.handoffBaseToPowerPack(view, file.path),
					});
				}
			}
		}

		actions.push({
			id: "save-profile",
			name: "Save current setup as profile",
			description: "Create a Pro search profile from the current mode, query, preview, file type, and folder settings.",
			requiresPro: true,
			run: () => this.workflows.saveCurrentProfile(),
		});

		// The batch/export block operates on files. Only offer it when the result
		// set actually contains files, so a command/folder/workflow row never
		// surfaces "Batch move" or "Create MOC" that would act on the wrong set.
		if (this.resultItemsForBatch().length > 0) {
			// All batch/export actions are Pro and share the same shape; the only
			// per-row differences are id/name/description and which batchOps call
			// they run, so drive them from one table instead of ten near-identical
			// object literals. Order here is the order shown in the palette.
			const batchActions: Array<[id: string, name: string, description: string, run: () => void]> = [
				["copy-results", "Copy results as Markdown", "Copy selected results, or the current result list, as Markdown links.", () => batchOps.copyResultsAsMarkdown(this.batchContext())],
				["export-results", "Export results to note", "Create a Markdown note containing selected/search results.", () => batchOps.exportResultsToNote(this.batchContext())],
				["batch-add-tag", "Batch add tag", "Append a tag to selected Markdown files.", () => batchOps.batchAddTag(this.batchContext())],
				["batch-remove-tag", "Batch remove tag", "Remove a tag from selected Markdown files.", () => batchOps.batchRemoveTag(this.batchContext())],
				["batch-set-property", "Batch set property", "Set a frontmatter property on selected Markdown files.", () => batchOps.batchSetProperty(this.batchContext())],
				["batch-move", "Batch move files", "Move selected files into a target folder.", () => batchOps.batchMoveFiles(this.batchContext())],
				["batch-star", "Batch star results", "Add selected/current result files to Starred pins.", () => batchOps.batchSetStarred(this.batchContext(), true)],
				["batch-unstar", "Batch unstar results", "Remove selected/current result files from Starred pins.", () => batchOps.batchSetStarred(this.batchContext(), false)],
				["create-moc", "Create MOC from results", "Create a grouped index note from selected/current results.", () => batchOps.createMocFromResults(this.batchContext())],
				["append-links", "Append links to active note", "Append selected/current result links to the active Markdown note.", () => batchOps.appendLinksToActiveNote(this.batchContext())],
			];
			for (const [id, name, description, run] of batchActions) {
				actions.push({ id, name, description, requiresPro: true, run });
			}
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
		// Seek to the matched line for anything that carries one, so opening a
		// symbol/heading/content hit via the menu lands on the passage — matching
		// what Enter (openItem) already does.
		const menu = new Menu();

		const openIn = (paneType: "tab" | "split" | "window") => {
			this.close();
			void (async () => {
				const leaf = this.app.workspace.getLeaf(paneType);
				await leaf.openFile(file);
				this.seekToItemLine(leaf, item);
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
					.onClick(() => {
						showInFolder.call(this.app, file.path);
					})
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

	private recordSearch(): void {
		const raw = this.inputEl.value.trim();
		if (!raw) return;
		// Strip mode prefixes so history stores the plain query text.
		const { body } = this.resolveQuery(raw);
		if (body.length > 0) this.plugin.trackSearch(body);
	}

	/** Mount or unmount the preview pane to match the currently-effective
	 * setting, so switching to a profile with a different showPreview updates the
	 * layout live instead of only on the next open. */
	private syncPreviewMount(): void {
		const shouldShow = this.previewEnabled();
		if (shouldShow && !this.preview.isMounted) {
			this.preview.mount(this.bodyEl);
			this.containerEl.addClass("has-preview");
		} else if (!shouldShow && this.preview.isMounted) {
			this.preview.unload();
			this.containerEl.removeClass("has-preview");
		}
	}

	private updatePreview(): void {
		this.syncPreviewMount();
		if (!this.preview.isMounted) return;
		const item = this.items[this.selectedIndex];
		this.preview.update(item ? itemFile(item) : null, {
			terms: this.previewHighlightTerms(item),
			focusText: getPreviewFocusText(item),
		});
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
		// While an IME candidate window is open (evt.isComposing / keyCode 229),
		// these keys belong to the composition — navigating the result list or
		// activating a result would discard the in-progress text. Let them through
		// to the input untouched, matching Obsidian's own suggesters.
		this.scope.register([], "ArrowDown", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.moveSelection(1);
			return false;
		});
		this.scope.register([], "ArrowUp", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.moveSelection(-1);
			return false;
		});
		// Jump-to-ends and page navigation for long result lists. Like the arrow
		// keys, these defer during IME composition (isComposing) — a CJK user paging
		// an IME candidate window with Home/End/PageUp/PageDown must not have the
		// keypress swallowed to drive the result list instead.
		this.scope.register([], "Home", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.setSelectedIndex(nextSelectedIndex(this.selectedIndex, this.items.length, { type: "first" }));
			return false;
		});
		this.scope.register([], "End", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.setSelectedIndex(nextSelectedIndex(this.selectedIndex, this.items.length, { type: "last" }));
			return false;
		});
		this.scope.register([], "PageDown", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.setSelectedIndex(nextSelectedIndex(this.selectedIndex, this.items.length, { type: "page", delta: 1, pageSize: this.pageSize() }));
			return false;
		});
		this.scope.register([], "PageUp", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.setSelectedIndex(nextSelectedIndex(this.selectedIndex, this.items.length, { type: "page", delta: -1, pageSize: this.pageSize() }));
			return false;
		});
		// Emacs-style aliases so hands never leave the home row.
		this.scope.register(["Ctrl"], "n", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.moveSelection(1);
			return false;
		});
		this.scope.register(["Ctrl"], "p", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.moveSelection(-1);
			return false;
		});
		this.scope.register([], "Enter", (evt) => {
			// Enter confirms the IME candidate mid-composition — don't activate a
			// result and close the modal out from under the user's input.
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.safeActivate();
			return false;
		});
		// Ctrl+Enter flips the default open target: new tab normally, current
		// tab when "open in new tab by default" is on.
		this.scope.register(["Mod"], "Enter", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.safeActivate(this.plugin.settings.defaultNewTab ? null : "tab");
			return false;
		});
		this.scope.register(["Mod", "Alt"], "Enter", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.safeActivate("split");
			return false;
		});
		this.scope.register(["Alt"], "Enter", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			const item = this.items[this.selectedIndex];
			if (item) this.openActionsMenu(item);
			return false;
		});
		this.scope.register(["Shift"], "Enter", (evt) => {
			// A held Shift while committing an IME candidate must not fire
			// createFromQuery and close the modal out from under the composition.
			if (evt.isComposing) return true;
			evt.preventDefault();
			void this.createFromQuery();
			return false;
		});
		this.scope.register(["Mod"], "k", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.openActionPalette();
			return false;
		});
		this.scope.register([], "Escape", (evt) => {
			// Escape cancels the IME composition first; only unwind modal state
			// once there's no active composition to dismiss.
			if (evt.isComposing) return true;
			evt.preventDefault();
			if (this.actionContext) this.closeActionPalette();
			else if (this.drillFile) this.exitDrill();
			else this.close();
			return false;
		});
		this.scope.register([], "Tab", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.cycleMode(1);
			return false;
		});
		this.scope.register(["Shift"], "Tab", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.cycleMode(-1);
			return false;
		});

		// Mod+S saves the current search as a workflow — registered for ALL tiers,
		// NOT behind the Pro gate below. Workflows are free up to FREE_WORKFLOW_LIMIT,
		// and saveCurrentWorkflow() itself shows the upgrade notice when a free user is
		// already at the limit. Gating this behind Pro (as it was) made the free
		// "save a workflow" path that Settings and the changelog advertise literally
		// unreachable — pressing Mod+S did nothing for a free user.
		this.scope.register(["Mod"], "s", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.workflows.saveCurrentWorkflow();
			return false;
		});

		if (!this.plugin.settings.isPro) return;

		this.scope.register(["Mod"], " ", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.toggleCheck();
			return false;
		});
		this.scope.register(["Mod"], "d", (evt) => {
			if (evt.isComposing) return true;
			evt.preventDefault();
			this.toggleStarSelected();
			return false;
		});
	}

	private focusTimers: number[] = [];
	private focusRaf: number | null = null;
	// The window the focus retries are scheduled on. Derived from the input's own
	// document so a modal rendered in a popout schedules its rAF/timers on THAT
	// window (whose animation frames aren't throttled while the popout has focus),
	// matching the ownerDocument-based activeElement check in applyFocus below.
	private focusWin: Window = window;

	private clearFocusTimers(): void {
		for (const id of this.focusTimers) this.focusWin.clearTimeout(id);
		this.focusTimers = [];
		// The deferred focus retry also runs off a rAF — track and cancel it so no
		// callback fires against a torn-down modal.
		if (this.focusRaf !== null) {
			this.focusWin.cancelAnimationFrame(this.focusRaf);
			this.focusRaf = null;
		}
	}

	private focusInput(): void {
		// Drop any focus retries still queued from a previous call so rapid
		// focusInput() invocations (drill, workflow/profile activation, palette
		// toggles) don't stack up and steal focus from a just-opened child modal.
		// clearFocusTimers() runs against the PRIOR focusWin (where those ids live)
		// before we re-derive it below.
		this.clearFocusTimers();
		this.focusWin = this.inputEl?.ownerDocument.defaultView ?? window;

		const applyFocus = () => {
			if (!this.inputEl?.isConnected) return;
			// ownerDocument, not the global document — popout-window safe.
			if (this.inputEl.ownerDocument.activeElement === this.inputEl) return;
			this.inputEl.focus({ preventScroll: true });
			if (this.pendingSelectAll) {
				// Seeded query: select it so the first keystroke replaces the seed
				// (arrow/End still edit in place). Only once, on first focus.
				this.pendingSelectAll = false;
				this.inputEl.select();
			} else {
				const end = this.inputEl.value.length;
				this.inputEl.setSelectionRange(end, end);
			}
		};

		applyFocus();
		this.focusRaf = this.focusWin.requestAnimationFrame(applyFocus);
		this.focusTimers.push(this.focusWin.setTimeout(applyFocus, 0));
		this.focusTimers.push(this.focusWin.setTimeout(applyFocus, 50));
	}
}
