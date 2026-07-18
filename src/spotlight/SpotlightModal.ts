import {
	App,
	type EventRef,
	Modal,
	Platform,
	setIcon,
} from "obsidian";
import type VaultSpotlightPlugin from "../main";
import { clampIndex, nextSelectedIndex } from "../core/selectionReducer.mjs";
import { showOnboarding } from "../core/onboarding.mjs";
import { getHelpSections, getModePlaceholder, getModifierLabel, getPreviewFocusText } from "../core/modalCopy.mjs";
import { PRO_UNLOCK_SUMMARY } from "../core/featureGates.mjs";
import { itemFile, type ResultItem, type SpotlightMode } from "./resultTypes";
import { PreviewPane } from "./PreviewPane";
import { CaptureController } from "./CaptureController";
import { WorkflowController } from "./WorkflowController";
import { SearchController } from "./SearchController";
import { ModeController } from "./ModeController";
import { registerSpotlightScope } from "./keymap";
import {
	applyRowState,
	renderResults,
	renderLoadingSkeletons,
	renderEmptyStateInto,
	renderFooterShortcuts,
	renderStatus,
	setModeBadge,
} from "./resultRow";
import { attachSpotlightListeners, buildSpotlightLayout, renderHelpOverlay, InputFocuser } from "./layout";

// Re-exported so existing importers keep working after the types moved to
// resultTypes.ts.
export { MODE_ORDER, type SpotlightMode } from "./resultTypes";

/**
 * The Spotlight modal is a "dumb" view: it owns the DOM (header, listbox, footer,
 * preview mount, focus + scope keymap) and delegates all logic to two controllers.
 * SearchController owns query execution + the result set; ModeController owns mode
 * state + activations. The modal implements both host seams (as the object literals
 * passed to each controller) and is the ONLY mediator between them — mutable state
 * stays owned in one place and is reached through accessors, never cached copies.
 */
export class SpotlightModal extends Modal {
	private inputEl!: HTMLInputElement;
	private resultsEl!: HTMLDivElement;
	private bodyEl!: HTMLDivElement;
	private preview: PreviewPane;
	private capture: CaptureController;
	private workflows: WorkflowController;
	private search: SearchController;
	private modes: ModeController;
	private footerEl!: HTMLDivElement;
	private shortcutsEl!: HTMLDivElement;
	private statusEl!: HTMLSpanElement;
	private modeBadgeEl!: HTMLSpanElement;
	private helpBtn!: HTMLButtonElement;
	private hintEl!: HTMLDivElement;
	// The keyboard-shortcut overlay (Mod+/ or the header button), or null when closed.
	private helpEl: HTMLDivElement | null = null;
	// The row index currently carrying is-selected in the DOM, so a selection move
	// only restyles the two affected rows instead of all of them. -1 whenever the
	// list holds no real rows (empty/loading/skeletons).
	private renderedSelectedIndex = -1;
	// Signature of the last footer we built (selected kind + has-file). The shortcut
	// chips depend only on these, so an unchanged signature skips the full
	// teardown/rebuild on every arrow keypress.
	private footerSig = "";
	private drillPrefixTimer: number | null = null;
	// Suppresses mouseenter-driven selection while the keyboard is driving the
	// list, so programmatic scroll sliding rows under a stationary cursor can't
	// yank the selection sideways. Cleared by a real pointer move.
	private suppressHoverSelect = false;
	// Keeps the search input focused across re-renders (popout-safe, retry timers)
	// and owns the one-shot "select the seeded query" flag.
	private focuser = new InputFocuser(() => this.inputEl);

	private initialQuery: string;
	private metadataRef: EventRef | null = null;
	// True while an IME composition (CJK candidate window) is active — set from the
	// input's compositionstart/end events so the input handler can defer drill-in.
	private composing = false;
	// Platform modifier label ("Cmd" on macOS, else "Ctrl"), resolved once in
	// onOpen so the footer hints match the real Mod-key bindings and the hint bar.
	private modifierLabel = "Ctrl";

	// --- Delegating accessors: the test harness and the view's own render/selection
	// code read/write these through the modal, but the state lives in the controllers.
	get items(): ResultItem[] {
		return this.search.items;
	}
	get selectedIndex(): number {
		return this.search.selectedIndex;
	}
	set selectedIndex(index: number) {
		this.search.selectedIndex = index;
	}
	get mode(): SpotlightMode {
		return this.modes.mode;
	}
	set mode(mode: SpotlightMode) {
		this.modes.mode = mode;
	}
	private get checkedPaths(): Set<string> {
		return this.search.checkedPaths;
	}

	constructor(
		app: App,
		private plugin: VaultSpotlightPlugin,
		initialQuery = "",
		initialMode: SpotlightMode = "files"
	) {
		super(app);
		this.shouldRestoreSelection = false;
		this.initialQuery = initialQuery;
		// The preview follows internal links itself (closing the modal, like
		// activating a result does) so a Pro user can jump straight from the pane.
		this.preview = new PreviewPane(app, { close: () => this.close() });
		// Delight-action side effects (daily notes, capture, snippets, calc) live in
		// their own controller behind a tiny host (the batchOps pattern).
		this.capture = new CaptureController({
			app,
			plugin: this.plugin,
			close: () => this.close(),
			recordSearch: () => this.search.recordSearch(),
		});
		// Profile / workflow / custom-search save + apply, behind accessors so the
		// modal keeps ownership of the live mode/query/actionContext state.
		this.workflows = new WorkflowController({
			app,
			plugin: this.plugin,
			liveMode: () => this.modes.mode,
			liveQuery: () => this.inputEl.value,
			hasActionContext: () => this.modes.actionContext !== null,
			actionReturnMode: () => this.modes.actionReturnMode,
			actionReturnQuery: () => this.modes.actionReturnQuery,
			clearActionContext: () => this.modes.clearActionContext(),
			setMode: (mode) => {
				this.modes.mode = mode;
			},
			setQuery: (query) => {
				this.inputEl.value = query;
			},
			setActiveWorkflowId: (id) => {
				this.modes.activeWorkflowId = id;
			},
			currentProfileRankingMode: () => this.search.currentProfile()?.rankingMode,
			focusInput: () => this.focusInput(),
			runSearch: () => void this.search.runSearch(),
			closeActionPalette: () => this.modes.closeActionPalette(),
		});
		// Query execution + the result set. Reads live mode/query/action state back
		// through this host so it never caches a stale copy.
		this.search = new SearchController({
			app,
			plugin: this.plugin,
			capture: this.capture,
			inputValue: () => this.inputEl.value,
			resolveQuery: (raw) => this.modes.resolveQuery(raw),
			actionContext: () => this.modes.actionContext,
			availableActions: (context) => this.modes.availableActions(context),
			drillFile: () => this.modes.drillFile,
			activeWorkflowId: () => this.modes.activeWorkflowId,
			setBadge: (text, cls) => setModeBadge(this.modeBadgeEl, text, cls),
			// The large field, not just the small badge, must say what the active mode
			// searches — otherwise it invites "search notes" while Capture mode appends.
			setPlaceholder: (mode) => {
				this.inputEl.placeholder = getModePlaceholder(mode);
			},
			renderResults: () => this.renderResults(),
			renderEmptyState: (icon, title, desc) => this.renderEmptyState(icon, title, desc),
			renderLoading: () => this.renderLoading(),
			markSearching: () => this.resultsEl.addClass("is-searching"),
			hasVisibleRows: () => this.resultsEl.querySelector(".vault-spotlight-item") !== null,
			updateStatus: (count) => this.updateStatus(count),
			updatePreview: () => this.updatePreview(),
		});
		// Mode state + transitions. Reaches the result set through this host.
		this.modes = new ModeController(
			{
				app,
				plugin: this.plugin,
				capture: this.capture,
				workflows: this.workflows,
				commandSearcher: this.search.commandSearcher,
				editorSearcher: this.search.editorSearcher,
				inputValue: () => this.inputEl.value,
				setQuery: (query) => {
					this.inputEl.value = query;
				},
				focusInput: () => this.focusInput(),
				runSearch: () => void this.search.runSearch(),
				recordSearch: () => this.search.recordSearch(),
				close: () => this.close(),
				searchItems: () => this.search.items,
				selectedItem: () => this.search.items[this.search.selectedIndex] ?? null,
				checkedPaths: () => this.search.checkedPaths,
				clearChecked: () => this.search.checkedPaths.clear(),
				selectedRowRect: () =>
					this.resultsEl.querySelector<HTMLElement>(".is-selected")?.getBoundingClientRect() ?? null,
			},
			initialMode
		);
	}

	onOpen(): void {
		// Obsidian's Platform API instead of navigator.* for OS detection (per the
		// community review guidelines and popout-window safety).
		this.modifierLabel = getModifierLabel(Platform.isMacOS || Platform.isIosApp ? "mac" : "");
		this.containerEl.addClass("vault-spotlight-container");
		this.titleEl.empty();
		const { contentEl } = this;
		contentEl.empty();

		const refs = buildSpotlightLayout(contentEl, {
			isPro: this.plugin.settings.isPro,
			initialQuery: this.initialQuery,
			purchaseUrl: this.plugin.settings.purchaseUrl,
			proUnlockLead: `Unlock ${PRO_UNLOCK_SUMMARY}.`,
		});
		this.modeBadgeEl = refs.modeBadgeEl;
		this.helpBtn = refs.helpBtn;
		this.inputEl = refs.inputEl;
		this.hintEl = refs.hintEl;
		this.bodyEl = refs.bodyEl;
		this.resultsEl = refs.resultsEl;
		this.footerEl = refs.footerEl;
		this.shortcutsEl = refs.shortcutsEl;
		this.statusEl = refs.statusEl;

		this.focuser.pendingSelectAll = this.initialQuery.length > 0;
		this.helpBtn.addEventListener("click", () => this.toggleHelp());
		this.updateHint();

		// Row interactions (hover/click/star/context-menu) are delegated to the list
		// ONCE here, and the input's composition + drill-prefix handler is wired, all
		// driving this modal's state through the host below — see layout.ts.
		attachSpotlightListeners(this.inputEl, this.resultsEl, {
			modePrefixes: () => this.plugin.settings.modePrefixes,
			rowIndexFromEvent: (evt) => this.rowIndexFromEvent(evt),
			itemAt: (index) => this.items[index],
			selectedIndex: () => this.selectedIndex,
			select: (index) => {
				this.selectedIndex = index;
			},
			refreshSelection: () => this.updateSelectionHighlight(),
			allowHover: () => {
				this.suppressHoverSelect = false;
			},
			isHoverSuppressed: () => this.suppressHoverSelect,
			toggleStar: (path) => this.plugin.toggleStar(path),
			activate: () => this.modes.safeActivate(),
			openMenuAt: (index, evt) => {
				this.selectedIndex = index;
				this.updateSelectionHighlight();
				const item = this.items[index];
				if (item) this.modes.openActionsMenu(item, evt);
			},
			setComposing: (value) => {
				this.composing = value;
			},
			isComposing: () => this.composing,
			hasNavigated: () => this.modes.hasNavigated,
			resetNavigation: () => {
				this.modes.hasNavigated = false;
				this.modes.activeWorkflowId = "";
			},
			scheduleSearch: () => this.search.scheduleSearch(),
			inputValue: () => this.inputEl.value,
			clearInput: () => {
				this.inputEl.value = "";
			},
			drillInto: (file, mode) => this.modes.drillInto(file, mode),
			deferDrillReset: () => {
				this.drillPrefixTimer = window.setTimeout(() => {
					this.drillPrefixTimer = null;
					this.modes.hasNavigated = false;
					this.search.scheduleSearch();
				}, 260);
			},
			clearDrillTimer: () => this.clearDrillTimer(),
		});
		this.renderLoading();
		this.syncPreviewMount();
		this.renderFooter();

		this.registerScopeShortcuts();

		// Modal is not a Component, so it has no registerEvent(); track the ref
		// ourselves and release it in onClose().
		this.metadataRef = this.app.metadataCache.on("resolved", () => {
			if (this.search.hasMetadataFilters()) {
				// A passive index refresh must not move the user's place. Pass the intent
				// through scheduleSearch so a racing keystroke can't inherit it.
				this.search.scheduleSearch(true);
			}
		});

		this.focusInput();
		void this.search.runSearch().then(() => this.focusInput());
	}

	onClose(): void {
		if (this.metadataRef) {
			this.app.metadataCache.offref(this.metadataRef);
			this.metadataRef = null;
		}
		// Invalidates the in-flight search generation and clears the debounce +
		// loading timers so neither fires against the now-detached modal.
		this.search.cancelTimers();
		// The drill-prefix timer fires scheduleSearch() 260ms later; if left armed
		// it would run a full search against the now-detached modal (and re-arm
		// untracked timers), so release it alongside the others.
		this.clearDrillTimer();
		this.focuser.clear();
		// The overlay is a child of contentEl (emptied below), so just drop the ref.
		this.helpEl = null;
		this.preview.unload();
		this.plugin.onSpotlightClosed(this);
		this.containerEl.removeClass("vault-spotlight-container");
		this.containerEl.removeClass("has-preview");
		this.contentEl.empty();
	}

	private previewEnabled(): boolean {
		const profile = this.search.currentProfile();
		const workflow = this.search.currentWorkflow();
		return (
			this.plugin.settings.isPro &&
			(workflow?.scope?.showPreview ?? profile?.showPreview ?? this.plugin.settings.showPreview)
		);
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
		// A permanent path back to the full trigger sheet, regardless of open count —
		// so discoverability never dead-ends once the inline hints condense.
		this.hintEl.appendText(" · ");
		this.hintEl.createEl("code", { text: `${mod}+/` });
		this.hintEl.appendText(" shortcuts");
	}

	private renderLoading(): void {
		renderLoadingSkeletons(this.resultsEl);
		this.renderedSelectedIndex = -1;
	}

	private renderEmptyState(icon: string, title: string, desc: string): void {
		renderEmptyStateInto(this.resultsEl, icon, title, desc);
		this.renderedSelectedIndex = -1;
		// An empty state means no selection: collapse the footer to its base chips
		// (otherwise it keeps advertising the previously-selected item's keys as dead
		// keys) and clear the Pro preview pane (otherwise it strands the prior note
		// beside a "nothing found" list). Both no-op via their own guards when
		// nothing actually changed / the preview isn't mounted.
		this.renderFooter();
		this.updatePreview();
	}

	private renderResults(): void {
		// The DOM's freshly-selected row index is cached so the next selection move
		// only restyles two rows instead of the whole list.
		this.renderedSelectedIndex = renderResults(this.resultsEl, this.inputEl, {
			items: this.items,
			selectedIndex: this.selectedIndex,
			checkedPaths: this.checkedPaths,
			isPro: this.plugin.settings.isPro,
			isEmptyQuery: this.inputEl.value.trim().length === 0,
			showModifiedTime: this.plugin.settings.showModifiedTime,
			showMatchReasons: this.plugin.settings.ranking.showMatchReasons,
			renderEmptyState: (icon, title, desc) => this.renderEmptyState(icon, title, desc),
			renderFooter: () => this.renderFooter(),
		});
	}

	/** Resolve the result index for a delegated list event, or null if off-row. */
	private rowIndexFromEvent(evt: Event): number | null {
		const row = (evt.target as HTMLElement).closest<HTMLElement>(".vault-spotlight-item");
		if (!row || !this.resultsEl.contains(row)) return null;
		const index = Number(row.dataset.index);
		return Number.isInteger(index) && index >= 0 && index < this.items.length ? index : null;
	}

	private updateSelectionHighlight(): void {
		// Restyle only the row that lost selection and the one that gained it, not
		// every row — arrow-holding a long list otherwise did O(rows) DOM writes
		// plus a full footer rebuild and a forced reflow on every single step.
		const ctx = {
			items: this.items,
			selectedIndex: this.selectedIndex,
			checkedPaths: this.checkedPaths,
			isPro: this.plugin.settings.isPro,
		};
		const prev = this.renderedSelectedIndex;
		if (prev >= 0 && prev !== this.selectedIndex) {
			const prevRow = this.resultsEl.querySelector<HTMLElement>(`.vault-spotlight-item[data-index="${prev}"]`);
			if (prevRow) applyRowState(prevRow, prev, ctx);
		}
		const selected = this.resultsEl.querySelector<HTMLElement>(`.vault-spotlight-item[data-index="${this.selectedIndex}"]`);
		if (selected) applyRowState(selected, this.selectedIndex, ctx);
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
		renderFooterShortcuts(this.shortcutsEl, {
			selected,
			defaultNewTab: this.plugin.settings.defaultNewTab,
			isPro: this.plugin.settings.isPro,
			modifierLabel: this.modifierLabel,
		});
	}

	private updateStatus(count: number): void {
		// Skipped while the action palette is open, where `items` holds actions (not
		// results) and the checked set must survive into the batch operation.
		if (!this.modes.actionContext) this.search.pruneCheckedToVisible();
		renderStatus(this.statusEl, this.inputEl, { count, checkedSize: this.checkedPaths.size });
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
		this.modes.hasNavigated = true;
		this.updateSelectionHighlight();
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
			// Hollow star for both states; on/off is signalled by colour (see resultRow).
			setIcon(starBtn, "star");
			starBtn.setAttr("aria-label", item.isStarred ? "Unstar" : "Star");
		}
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
			terms: this.search.previewHighlightTerms(item),
			focusText: getPreviewFocusText(item),
		});
	}

	private registerScopeShortcuts(): void {
		// The keyboard layer lives in ./keymap; the modal only supplies bound actions
		// so its methods stay private. Behavior/order is identical to the old inline
		// registration and is covered by the modal interaction harness.
		registerSpotlightScope(this.scope, this.plugin.settings.isPro, {
			moveSelection: (delta) => this.moveSelection(delta),
			selectFirst: () => this.setSelectedIndex(nextSelectedIndex(this.selectedIndex, this.items.length, { type: "first" })),
			selectLast: () => this.setSelectedIndex(nextSelectedIndex(this.selectedIndex, this.items.length, { type: "last" })),
			pageMove: (delta: 1 | -1) => this.setSelectedIndex(nextSelectedIndex(this.selectedIndex, this.items.length, { type: "page", delta, pageSize: this.pageSize() })),
			activateDefault: () => this.modes.safeActivate(),
			activatePreferredTab: () => this.modes.safeActivate(this.plugin.settings.defaultNewTab ? null : "tab"),
			activateSplit: () => this.modes.safeActivate("split"),
			openContextMenuForSelection: () => {
				const item = this.items[this.selectedIndex];
				if (item) this.modes.openActionsMenu(item);
			},
			createFromQuery: () => void this.modes.createFromQuery(),
			openActionPalette: () => this.modes.openActionPalette(),
			escape: () => {
				// The help overlay is the outermost transient layer: dismiss it first so
				// Escape closes the cheatsheet before unwinding action/drill/modal state.
				if (this.helpEl) this.closeHelp();
				else if (this.modes.actionContext) this.modes.closeActionPalette();
				else if (this.modes.drillFile) this.modes.exitDrill();
				else this.close();
			},
			cycleMode: (delta: 1 | -1) => this.modes.cycleMode(delta),
			saveWorkflow: () => this.workflows.saveCurrentWorkflow(),
			toggleHelp: () => this.toggleHelp(),
			toggleCheck: () => this.toggleCheck(),
			toggleStarSelected: () => this.toggleStarSelected(),
		}, () => this.helpEl !== null);
	}

	/** Toggle the keyboard-shortcut overlay (Mod+/ or the header button). */
	private toggleHelp(): void {
		if (this.helpEl) this.closeHelp();
		else this.openHelp();
	}

	/**
	 * Mount the shortcut cheatsheet over the modal. The overlay derives its mode
	 * triggers from the LIVE, user-configurable prefixes so the full vocabulary stays
	 * reachable forever — the fix for the header hints collapsing after five opens.
	 */
	private openHelp(): void {
		if (this.helpEl) return;
		const sections = getHelpSections({
			isPro: this.plugin.settings.isPro,
			prefixes: this.plugin.settings.modePrefixes,
			modifierLabel: this.modifierLabel,
			escapeChar: this.plugin.settings.escapeChar,
		});
		this.helpEl = renderHelpOverlay(this.contentEl, sections, {
			onClose: () => this.closeHelp(),
			// Only offer to silence the inline hints when they're actually still showing
			// (i.e. the user hasn't already dismissed them), and actually persist it —
			// wiring the onboardingDismissed flag that previously had no writer.
			onDismissHints: this.plugin.settings.onboardingDismissed
				? null
				: () => this.dismissInlineHints(),
		});
		this.helpBtn.addClass("is-active");
		this.helpBtn.setAttr("aria-expanded", "true");
		// Move focus into the dialog so a screen reader announces it and Tab reaches the
		// Close / Hide-inline-hints controls (the scope's own keys are inert while it's
		// open). Focus returns to the input in closeHelp().
		this.helpEl.querySelector<HTMLElement>(".vault-spotlight-help-close")?.focus();
	}

	private closeHelp(): void {
		if (!this.helpEl) return;
		this.helpEl.remove();
		this.helpEl = null;
		this.helpBtn.removeClass("is-active");
		this.helpBtn.setAttr("aria-expanded", "false");
		this.focusInput();
	}

	/** Persist the "don't show the first-run inline hints" choice and collapse them
	 * now, then rebuild the overlay so its dismiss button disappears. */
	private dismissInlineHints(): void {
		this.plugin.settings.onboardingDismissed = true;
		void this.plugin.saveSettings();
		this.updateHint();
		this.closeHelp();
		this.openHelp();
	}

	private focusInput(): void {
		this.focuser.focus();
	}

	/** Release the drill-prefix timer (armed by the input handler; also cleared on
	 * every keystroke and in onClose so it can't fire against a detached modal). */
	private clearDrillTimer(): void {
		if (this.drillPrefixTimer !== null) {
			window.clearTimeout(this.drillPrefixTimer);
			this.drillPrefixTimer = null;
		}
	}
}
