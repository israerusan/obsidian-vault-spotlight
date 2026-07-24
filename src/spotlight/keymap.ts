import type { Scope } from "obsidian";

/**
 * The keyboard actions the Spotlight scope drives. SpotlightModal constructs this
 * (binding its own private methods) so the keyboard concern lives in ONE place and
 * the modal doesn't have to expose internals. The keymap only knows "key → action".
 */
export interface SpotlightKeymapActions {
	moveSelection(delta: number): void;
	selectFirst(): void;
	selectLast(): void;
	pageMove(delta: 1 | -1): void;
	activateDefault(): void;
	activatePreferredTab(): void;
	activateSplit(): void;
	openContextMenuForSelection(): void;
	createFromQuery(): void;
	openActionPalette(): void;
	showHistory(): void;
	escape(): void;
	cycleMode(delta: 1 | -1): void;
	saveWorkflow(): void;
	toggleHelp(): void;
	// Pro-only (registered after the isPro gate below):
	toggleCheck(): void;
	toggleStarSelected(): void;
}

/**
 * Register every Spotlight keyboard shortcut on the modal's Scope. Extracted from
 * SpotlightModal.registerScopeShortcuts() verbatim (same bindings, same order, same
 * IME/composition guards) so the keyboard layer is isolated and testable on its own;
 * the modal interaction harness exercises the resulting registrations.
 *
 * The modal's Scope is pushed onto Obsidian's keymap while the modal is open, so
 * these fire regardless of which element inside the modal holds DOM focus. Typed
 * characters are left untouched so they flow into the focused input natively. While
 * an IME candidate window is open (evt.isComposing / keyCode 229) the keys belong to
 * the composition — navigating or activating would discard the in-progress text — so
 * every handler returns `true` (pass-through) during composition.
 */
export function registerSpotlightScope(
	scope: Scope,
	isPro: boolean,
	actions: SpotlightKeymapActions,
	// True while the help overlay is open. Every navigation/activation/mode key
	// becomes inert (pass-through) in that state so a reflexive Enter can't open a
	// result and tear the modal down behind the cheatsheet. Only Escape (which closes
	// the overlay) and Mod+/ (which toggles it) stay live — see the two handlers below.
	isHelpOpen: () => boolean = () => false
): void {
	scope.register([], "ArrowDown", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.moveSelection(1);
		return false;
	});
	scope.register([], "ArrowUp", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.moveSelection(-1);
		return false;
	});
	// Alt+↓ summons the recent-search history — the same gesture that opens the
	// recent list in a browser search box or SAP field. Mode-agnostic and transient:
	// the searcher fills the list with past queries, and typing (or Escape) restores
	// the live search. Registered with the plain ArrowDown handler above so a bare
	// ↓ still moves the selection (the modifiers arrays match exactly).
	scope.register(["Alt"], "ArrowDown", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.showHistory();
		return false;
	});
	// Jump-to-ends and page navigation for long lists; defer during IME composition.
	scope.register([], "Home", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.selectFirst();
		return false;
	});
	scope.register([], "End", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.selectLast();
		return false;
	});
	scope.register([], "PageDown", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.pageMove(1);
		return false;
	});
	scope.register([], "PageUp", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.pageMove(-1);
		return false;
	});
	// Emacs-style aliases so hands never leave the home row.
	scope.register(["Ctrl"], "n", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.moveSelection(1);
		return false;
	});
	scope.register(["Ctrl"], "p", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.moveSelection(-1);
		return false;
	});
	scope.register([], "Enter", (evt) => {
		// Enter confirms the IME candidate mid-composition — don't activate + close.
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.activateDefault();
		return false;
	});
	// Ctrl+Enter flips the default open target: new tab normally, current tab when
	// "open in new tab by default" is on.
	scope.register(["Mod"], "Enter", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.activatePreferredTab();
		return false;
	});
	scope.register(["Mod", "Alt"], "Enter", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.activateSplit();
		return false;
	});
	scope.register(["Alt"], "Enter", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.openContextMenuForSelection();
		return false;
	});
	scope.register(["Shift"], "Enter", (evt) => {
		// A held Shift while committing an IME candidate must not fire createFromQuery.
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.createFromQuery();
		return false;
	});
	scope.register(["Mod"], "k", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.openActionPalette();
		return false;
	});
	scope.register([], "Escape", (evt) => {
		// Escape cancels the IME composition first; only unwind modal state when there
		// is no active composition to dismiss. Stays live while help is open — it is
		// how the overlay is dismissed (actions.escape() closes it first).
		if (evt.isComposing) return true;
		evt.preventDefault();
		actions.escape();
		return false;
	});
	scope.register([], "Tab", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.cycleMode(1);
		return false;
	});
	scope.register(["Shift"], "Tab", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.cycleMode(-1);
		return false;
	});

	// Mod+S saves the current search as a workflow — registered for ALL tiers, NOT
	// behind the Pro gate below. Workflows are free up to the free limit, and
	// saveWorkflow() itself shows the upgrade notice at the cap. Gating this behind
	// Pro (as it once was) made the advertised free "save a workflow" path unreachable.
	scope.register(["Mod"], "s", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.saveWorkflow();
		return false;
	});

	// Mod+/ toggles the shortcut cheatsheet — registered for ALL tiers (help must
	// never be Pro-gated). A bare "?" can't be used: it's a typeable query character,
	// so binding it would make notes with "?" in the name unsearchable.
	scope.register(["Mod"], "/", (evt) => {
		// Stays live while help is open so Mod+/ toggles the overlay closed again.
		if (evt.isComposing) return true;
		evt.preventDefault();
		actions.toggleHelp();
		return false;
	});

	if (!isPro) return;

	scope.register(["Mod"], " ", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.toggleCheck();
		return false;
	});
	scope.register(["Mod"], "d", (evt) => {
		if (evt.isComposing || isHelpOpen()) return true;
		evt.preventDefault();
		actions.toggleStarSelected();
		return false;
	});
}
