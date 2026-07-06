import { setIcon, type TFile } from "obsidian";
import { createExternalLink, DEFAULT_SETTINGS } from "../settings";
import { getDrillPrefixMatch } from "../core/modalCopy.mjs";
import { itemFile, type ResultItem, type SpotlightMode } from "./resultTypes";

/** The stable DOM nodes the modal keeps references to after onOpen builds them. */
export interface SpotlightLayoutRefs {
	modeBadgeEl: HTMLSpanElement;
	inputEl: HTMLInputElement;
	hintEl: HTMLDivElement;
	bodyEl: HTMLDivElement;
	resultsEl: HTMLDivElement;
	footerEl: HTMLDivElement;
	shortcutsEl: HTMLDivElement;
	statusEl: HTMLSpanElement;
}

export interface SpotlightLayoutOptions {
	isPro: boolean;
	initialQuery: string;
	purchaseUrl: string;
	/** Pre-formatted `Unlock …` CTA lead (holds PRO_UNLOCK_SUMMARY). */
	proUnlockLead: string;
}

/**
 * Build the static Spotlight modal scaffold — header, combobox input, results
 * listbox, footer (shortcut chips + aria-live status), and the free-tier Pro CTA —
 * and return the nodes the modal wires behaviour onto. Pure DOM assembly extracted
 * from onOpen; event listeners, focus, and the first search stay in the modal.
 */
export function buildSpotlightLayout(
	contentEl: HTMLElement,
	opts: SpotlightLayoutOptions
): SpotlightLayoutRefs {
	contentEl.addClass("vault-spotlight-modal");

	const header = contentEl.createDiv({ cls: "vault-spotlight-header" });
	const titleRow = header.createDiv({ cls: "vault-spotlight-title-row" });
	titleRow.createDiv({ cls: "vault-spotlight-title", text: "Vault Spotlight" });
	// Polite live region so cycling modes (Tab) is announced to screen readers
	// as the badge text changes (Files → Commands → Content …).
	const modeBadgeEl = titleRow.createSpan({
		cls: "vault-spotlight-mode-badge",
		text: "Files",
		attr: { "aria-live": "polite" },
	});

	const inputWrap = header.createDiv({ cls: "vault-spotlight-input-wrap" });
	const searchIcon = inputWrap.createSpan({ cls: "vault-spotlight-search-icon" });
	setIcon(searchIcon, "search");
	searchIcon.setAttr("aria-hidden", "true");

	const inputEl = inputWrap.createEl("input", {
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
	inputEl.value = opts.initialQuery;

	const hintEl = header.createDiv({ cls: "vault-spotlight-hint" });

	const bodyEl = contentEl.createDiv({ cls: "vault-spotlight-body" });
	const resultsEl = bodyEl.createDiv({
		cls: "vault-spotlight-results",
		attr: {
			role: "listbox",
			id: "vault-spotlight-listbox",
			"aria-label": "Search results",
			"aria-multiselectable": opts.isPro ? "true" : "false",
		},
	});

	const footerEl = contentEl.createDiv({ cls: "vault-spotlight-footer" });
	// The shortcut chips are rebuilt per selection, but the aria-live status
	// node is created ONCE and kept stable — assistive tech only announces
	// mutations to a live region that already existed in the a11y tree, so
	// recreating it on every keystroke would swallow "N results"/"N selected".
	const shortcutsEl = footerEl.createDiv({ cls: "vault-spotlight-shortcuts" });
	const statusEl = footerEl.createSpan({
		cls: "vault-spotlight-status",
		attr: { role: "status", "aria-live": "polite" },
	});

	if (!opts.isPro) {
		const cta = contentEl.createDiv({ cls: "vault-spotlight-pro-cta" });
		const lead = cta.createDiv({ cls: "vault-spotlight-pro-cta-lead" });
		const ctaIcon = lead.createDiv({ cls: "vault-spotlight-pro-cta-icon" });
		setIcon(ctaIcon, "sparkles");
		ctaIcon.setAttr("aria-hidden", "true");
		lead.createDiv({ cls: "vault-spotlight-pro-cta-text", text: opts.proUnlockLead });
		createExternalLink(cta, {
			cls: "vault-spotlight-pro-btn",
			text: "Get Pro",
			url: opts.purchaseUrl,
			fallback: DEFAULT_SETTINGS.purchaseUrl,
		});
	}

	return { modeBadgeEl, inputEl, hintEl, bodyEl, resultsEl, footerEl, shortcutsEl, statusEl };
}

/**
 * Keeps the search input focused across the modal's re-renders. Focus is applied
 * immediately and re-tried on the next animation frame + two short timeouts so a
 * just-mounted (or popout-window) input reliably ends up focused. Timers/rAF are
 * scheduled on the input's OWN window (popout-safe) and tracked so a torn-down
 * modal can cancel them. Owns the one-shot "select the seeded query" flag.
 */
export class InputFocuser {
	private timers: number[] = [];
	private raf: number | null = null;
	private win: Window = window;
	// Select the seeded query on first focus so the first keystroke replaces it.
	pendingSelectAll = false;

	constructor(private getInput: () => HTMLInputElement | undefined) {}

	clear(): void {
		for (const id of this.timers) this.win.clearTimeout(id);
		this.timers = [];
		if (this.raf !== null) {
			this.win.cancelAnimationFrame(this.raf);
			this.raf = null;
		}
	}

	focus(): void {
		// Drop any focus retries still queued from a previous call so rapid focus()
		// invocations don't stack up and steal focus from a just-opened child modal.
		this.clear();
		const input = this.getInput();
		this.win = input?.ownerDocument.defaultView ?? window;

		const applyFocus = () => {
			const el = this.getInput();
			if (!el?.isConnected) return;
			// ownerDocument, not the global document — popout-window safe.
			if (el.ownerDocument.activeElement === el) return;
			el.focus({ preventScroll: true });
			if (this.pendingSelectAll) {
				// Seeded query: select it so the first keystroke replaces the seed
				// (arrow/End still edit in place). Only once, on first focus.
				this.pendingSelectAll = false;
				el.select();
			} else {
				const end = el.value.length;
				el.setSelectionRange(end, end);
			}
		};

		applyFocus();
		this.raf = this.win.requestAnimationFrame(applyFocus);
		this.timers.push(this.win.setTimeout(applyFocus, 0));
		this.timers.push(this.win.setTimeout(applyFocus, 50));
	}
}

/** The view state + intents the delegated list/input listeners drive. */
export interface SpotlightListenerHost {
	modePrefixes(): Parameters<typeof getDrillPrefixMatch>[1];
	rowIndexFromEvent(evt: Event): number | null;
	itemAt(index: number): ResultItem | undefined;
	selectedIndex(): number;
	/** Raw selection set (no drill-arm), used by hover/click before the intent. */
	select(index: number): void;
	refreshSelection(): void;
	allowHover(): void;
	isHoverSuppressed(): boolean;
	toggleStar(path: string): boolean;
	activate(): void;
	openMenuAt(index: number, evt: MouseEvent): void;
	setComposing(value: boolean): void;
	isComposing(): boolean;
	hasNavigated(): boolean;
	resetNavigation(): void;
	scheduleSearch(): void;
	inputValue(): string;
	clearInput(): void;
	drillInto(file: TFile, mode: SpotlightMode): void;
	deferDrillReset(): void;
	clearDrillTimer(): void;
}

/**
 * Wire the modal's delegated pointer listeners (hover/click/star/context-menu are
 * bound ONCE on the list, not per row) and the input's composition + drill-prefix
 * handler. Extracted verbatim from onOpen; all state lives in the host.
 */
export function attachSpotlightListeners(
	inputEl: HTMLInputElement,
	resultsEl: HTMLDivElement,
	host: SpotlightListenerHost
): void {
	// A real pointer move re-enables hover selection; keyboard navigation and the
	// programmatic scroll it triggers do not fire mousemove, so the cursor resting
	// over the list can't hijack the keyboard selection.
	resultsEl.addEventListener("mousemove", () => host.allowHover());
	resultsEl.addEventListener("mouseover", (evt) => {
		// Ignore hover selection triggered by rows sliding under a stationary cursor
		// during keyboard navigation; only honour a real pointer move.
		if (host.isHoverSuppressed()) return;
		const index = host.rowIndexFromEvent(evt);
		if (index === null || index === host.selectedIndex()) return;
		host.select(index);
		host.refreshSelection();
	});
	// The star toggle stays on mousedown: it must preventDefault to keep focus in
	// the input (a re-search would reset the selection and scroll to the top).
	resultsEl.addEventListener("mousedown", (evt) => {
		const starBtn = (evt.target as HTMLElement).closest<HTMLElement>(".vault-spotlight-star-btn");
		if (!starBtn) return;
		const index = host.rowIndexFromEvent(evt);
		if (index === null) return;
		const item = host.itemAt(index);
		evt.preventDefault();
		evt.stopPropagation();
		if (item?.kind === "file") {
			item.isStarred = host.toggleStar(item.file.path);
			setIcon(starBtn, item.isStarred ? "star" : "star-off");
			const row = starBtn.closest<HTMLElement>(".vault-spotlight-item");
			row?.toggleClass("is-starred", item.isStarred);
		}
	});
	// Activation runs on CLICK, not mousedown, so a touch scroll-drag that starts on
	// a row doesn't activate it before the finger lifts. Star clicks are ignored.
	resultsEl.addEventListener("click", (evt) => {
		if ((evt.target as HTMLElement).closest(".vault-spotlight-star-btn")) return;
		const index = host.rowIndexFromEvent(evt);
		if (index === null) return;
		host.select(index);
		host.activate();
	});
	resultsEl.addEventListener("contextmenu", (evt) => {
		const index = host.rowIndexFromEvent(evt);
		if (index === null) return;
		const item = host.itemAt(index);
		// The menu only opens for rows backed by a file (same gate the footer chip
		// uses), so a right-click elsewhere falls through to the default.
		if (!item || !itemFile(item)) return;
		evt.preventDefault();
		host.openMenuAt(index, evt);
	});

	// Track IME composition via composition events rather than reading
	// evt.isComposing off the input event (our pinned lib types it as a plain
	// Event, needing a cast the review flags as redundant). compositionend fires
	// just before the committing input event, so `composing` is already false then.
	inputEl.addEventListener("compositionstart", () => host.setComposing(true));
	inputEl.addEventListener("compositionend", () => host.setComposing(false));
	inputEl.addEventListener("input", () => {
		// Never run drill-in logic mid-IME-composition: an intermediate CJK candidate
		// that transiently equals a mode prefix would otherwise clear the input and
		// drill/redirect, discarding the in-progress text. Just search the interim
		// value; the committing input runs the normal path below.
		if (host.isComposing()) {
			host.resetNavigation();
			host.scheduleSearch();
			return;
		}
		const item = host.itemAt(host.selectedIndex());
		const file = item ? itemFile(item) : null;
		const drill = getDrillPrefixMatch(host.inputValue(), host.modePrefixes());
		host.clearDrillTimer();
		if (host.hasNavigated() && drill.mode && file?.extension === "md") {
			host.clearInput();
			host.drillInto(file, drill.mode);
			return;
		}
		if (host.hasNavigated() && drill.pending) {
			host.deferDrillReset();
			return;
		}
		host.resetNavigation();
		host.scheduleSearch();
	});
}
