import { setIcon } from "obsidian";
import { renderHighlightedText } from "../search/fuzzy";
import { getVaultFileKind, iconForFileKind } from "../search/vaultFiles";
import { iconForSymbolType } from "../search/SymbolSearcher";
import { buildFileDecorations } from "../core/resultDecorators.mjs";
import { getShortcutHints } from "../core/modalCopy.mjs";
import { capitalize, itemFile, type ResultItem } from "./resultTypes";

export interface ResultRowOptions {
	isEmptyQuery: boolean;
	showModifiedTime: boolean;
	showMatchReasons?: boolean;
}

export function renderResultRow(
	row: HTMLDivElement,
	item: ResultItem,
	options: ResultRowOptions
): void {
	const iconWrap = row.createDiv({ cls: "vault-spotlight-item-icon-wrap" });
	// The glyph is decorative; the row's title/badges/meta carry the meaning.
	iconWrap.setAttr("aria-hidden", "true");
	const body = row.createDiv({ cls: "vault-spotlight-item-body" });
	const titleRow = body.createDiv({ cls: "vault-spotlight-item-title-row" });
	const title = titleRow.createDiv({ cls: "vault-spotlight-item-title" });

	if (item.kind === "file") {
		setIcon(iconWrap, iconForFileKind(item.fileKind));
		row.toggleClass("is-starred", item.isStarred);
		renderHighlightedText(title, item.file.basename, item.matchIndices);
		const decorations = buildFileDecorations({
			parentPath: item.file.parent?.path || "/",
			modifiedLabel: options.showModifiedTime ? item.modifiedLabel : "",
			fileKind: item.fileKind === "markdown" ? "note" : item.fileKind,
			isStarred: item.isStarred && !options.isEmptyQuery,
			isBookmarked: item.isBookmarked && !options.isEmptyQuery,
			isRecent: item.isRecent && !options.isEmptyQuery,
			primaryMatch: item.primaryMatch,
			aliasMatched: item.aliasMatched,
			tags: item.tags,
			aliases: item.aliases,
		});
		for (const badge of decorations.badges) {
			titleRow.createSpan({
				cls: badge === "Starred" ? "vault-spotlight-item-badge is-star" : "vault-spotlight-item-badge",
				text: badge,
			});
		}
		if (options.showMatchReasons && !options.isEmptyQuery) {
			titleRow.createSpan({ cls: "vault-spotlight-item-badge is-type", text: decorations.reason });
		}
		body.createDiv({ cls: "vault-spotlight-item-meta", text: decorations.meta });
	} else if (item.kind === "content") {
		setIcon(
			iconWrap,
			item.file.extension === "canvas"
				? "layout-dashboard"
				: item.file.extension === "base"
					? "database"
					: "text"
		);
		title.setText(item.file.basename);
		const engineLabel =
			item.engine === "ripgrep"
				? "Ripgrep"
				: item.engine === "canvas"
					? "Canvas"
					: item.engine === "base"
						? "Base"
						: "Match";
		titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: `${engineLabel} · L${item.line}` });
		// Highlight the matched terms in the snippet so the flagship content mode is
		// as scannable as the filename mode (and matches the preview pane's hit mark).
		const snippetEl = body.createDiv({ cls: "vault-spotlight-item-snippet" });
		renderHighlightedText(snippetEl, item.snippet, item.matchIndices);
		// Parent folder only, not the full path: the basename is already the title and
		// the icon marks the kind, so the full path just restated it and pushed the
		// (already 2-line) content row taller than every other mode's single meta line.
		body.createDiv({ cls: "vault-spotlight-item-meta", text: item.file.parent?.path || "/" });
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
			titleRow.createSpan({ cls: "vault-spotlight-item-badge is-active", text: "Active" });
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
		titleRow.createSpan({ cls: "vault-spotlight-item-badge is-phrase", text: "Recent search" });
		body.createDiv({ cls: "vault-spotlight-item-meta", text: "Press ↵ to search again" });
	} else if (item.kind === "collection") {
		setIcon(iconWrap, item.isPinned ? "star" : "search");
		title.setText(item.name);
		titleRow.createSpan({ cls: "vault-spotlight-item-badge is-phrase", text: item.isPinned ? "Pinned collection" : "Smart collection" });
		body.createDiv({ cls: "vault-spotlight-item-meta", text: item.query });
	} else if (item.kind === "profile") {
		setIcon(iconWrap, item.isActive ? "check-circle" : "sliders-horizontal");
		title.setText(item.name);
		titleRow.createSpan({ cls: "vault-spotlight-item-badge is-phrase", text: item.isActive ? "Active profile" : "Search profile" });
		body.createDiv({ cls: "vault-spotlight-item-meta", text: `${item.defaultMode}${item.defaultQuery ? ` · ${item.defaultQuery}` : ""}` });
	} else if (item.kind === "workflow") {
		setIcon(iconWrap, item.isPinned ? "sparkles" : "play-circle");
		title.setText(item.name);
		titleRow.createSpan({ cls: "vault-spotlight-item-badge is-phrase", text: item.isStarter ? "Starter workflow" : "Workflow" });
		if (item.rankingMode) {
			titleRow.createSpan({ cls: "vault-spotlight-item-badge is-type", text: item.rankingMode });
		}
		body.createDiv({ cls: "vault-spotlight-item-meta", text: `${item.mode}${item.query ? ` · ${item.query}` : ""}` });
	} else if (item.kind === "action") {
		setIcon(iconWrap, item.action.requiresPro ? "sparkles" : "bolt");
		title.setText(item.action.name);
		titleRow.createSpan({ cls: item.action.requiresPro ? "vault-spotlight-item-badge is-phrase" : "vault-spotlight-item-badge", text: item.action.requiresPro ? "Pro action" : "Action" });
		body.createDiv({ cls: "vault-spotlight-item-meta", text: item.action.description });
	} else if (item.kind === "calc") {
		row.addClass("is-calc");
		setIcon(iconWrap, "calculator");
		title.addClass("vault-spotlight-calc-result");
		title.setText(item.result);
		titleRow.createSpan({ cls: "vault-spotlight-item-badge is-action", text: "↵ Copy" });
		body.createDiv({ cls: "vault-spotlight-item-meta", text: `${item.expression} · ${item.detail}` });
	} else if (item.kind === "datejump") {
		setIcon(iconWrap, "calendar-days");
		title.setText(item.label);
		titleRow.createSpan({
			cls: item.exists ? "vault-spotlight-item-badge is-phrase is-active" : "vault-spotlight-item-badge is-phrase is-action",
			text: item.exists ? "Daily note" : "Create daily note",
		});
		body.createDiv({ cls: "vault-spotlight-item-meta", text: item.path });
	} else if (item.kind === "capture") {
		setIcon(iconWrap, "plus-circle");
		title.setText(item.text || "Type something to capture…");
		titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: item.label });
		body.createDiv({ cls: "vault-spotlight-item-meta", text: item.description });
	} else if (item.kind === "quickaction") {
		setIcon(iconWrap, item.icon);
		title.setText(item.label);
		titleRow.createSpan({ cls: "vault-spotlight-item-badge is-action", text: "Quick action" });
		body.createDiv({ cls: "vault-spotlight-item-meta", text: item.description });
	} else if (item.kind === "snippet") {
		setIcon(iconWrap, "clipboard-type");
		renderHighlightedText(title, item.name, item.matchIndices);
		titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: "Snippet" });
		body.createDiv({ cls: "vault-spotlight-item-snippet", text: item.body.replace(/\s+/g, " ").slice(0, 120) });
	} else {
		row.addClass("is-emphasis");
		setIcon(iconWrap, "file-plus");
		title.setText(`Create “${item.name}”`);
		titleRow.createSpan({ cls: "vault-spotlight-item-badge is-action", text: "New" });
		body.createDiv({ cls: "vault-spotlight-item-meta", text: "Create a new note" });
	}
}

/**
 * Group label for a browse (empty-query) row, or null when the query is active or
 * the row kind doesn't head a section. Saved objects (Workflows / profiles /
 * collections) and the file browse buckets (Starred / Bookmarks / Recent / All).
 */
function browseSection(item: ResultItem, isEmptyQuery: boolean): string | null {
	if (item.kind === "quickaction" && isEmptyQuery) return "Quick actions";
	if (item.kind === "workflow" && isEmptyQuery) return "Workflows";
	if (item.kind === "profile" && isEmptyQuery) return "Search profiles";
	if (item.kind === "collection" && isEmptyQuery) return "Smart collections";
	if (item.kind !== "file" || !isEmptyQuery) return null;
	if (item.isStarred) return "Starred";
	if (item.isBookmarked) return "Bookmarks";
	if (item.isRecent) return "Recent";
	return "All notes";
}

export interface ResultListContext {
	items: ResultItem[];
	selectedIndex: number;
	checkedPaths: Set<string>;
	isPro: boolean;
	isEmptyQuery: boolean;
	showModifiedTime: boolean;
	showMatchReasons: boolean;
}

/**
 * Render the (non-empty) result rows into `resultsEl`, with section labels, the
 * per-row selected/checked state, the Pro multi-select check + star affordances,
 * and the combobox's aria-activedescendant + scroll-into-view for the selected row.
 * The caller empties `resultsEl` first and rebuilds the footer afterwards. Hover /
 * click / star / context-menu are handled by delegated listeners on `resultsEl`.
 */
export function renderResultList(
	resultsEl: HTMLDivElement,
	inputEl: HTMLInputElement,
	ctx: ResultListContext
): void {
	let lastSection = "";
	ctx.items.forEach((item, index) => {
		const section = browseSection(item, ctx.isEmptyQuery);
		if (section && section !== lastSection) {
			// role=presentation: a listbox may only contain option (and group)
			// children, so a bare label div is exposed as presentational rather
			// than as a stray, roleless node inside the options.
			resultsEl.createDiv({ cls: "vault-spotlight-section-label", text: section, attr: { role: "presentation" } });
			lastSection = section;
		}

		const row = resultsEl.createDiv({
			cls: "vault-spotlight-item",
			attr: { role: "option", id: `vault-spotlight-opt-${index}` },
		});
		row.dataset.index = String(index);
		const file = itemFile(item);
		const selected = index === ctx.selectedIndex;
		row.toggleClass("is-selected", selected);
		row.setAttribute("aria-selected", String(selected));
		if (file) {
			const checked = ctx.checkedPaths.has(file.path);
			row.toggleClass("is-checked", checked);
			if (ctx.isPro) row.setAttribute("aria-checked", String(checked));
		}

		if (ctx.isPro && file) {
			const check = row.createDiv({ cls: "vault-spotlight-check" });
			check.setAttr("aria-hidden", "true");
			if (ctx.checkedPaths.has(file.path)) {
				setIcon(check, "check");
			}
		}

		renderResultRow(row, item, {
			isEmptyQuery: ctx.isEmptyQuery,
			showModifiedTime: ctx.showModifiedTime,
			showMatchReasons: ctx.showMatchReasons,
		});

		if (ctx.isPro && item.kind === "file") {
			// A focusable/interactive descendant is invalid inside role=option, so
			// this stays a mouse-only affordance (tabindex -1, hidden from AT); the
			// keyboard/AT path to star is the Mod+D shortcut.
			const starBtn = row.createEl("button", {
				cls: "vault-spotlight-star-btn",
				attr: { type: "button", tabindex: "-1", "aria-hidden": "true" },
			});
			// Always the hollow "star" glyph: the starred vs unstarred state is carried
			// by colour/opacity (faint outline → filled yellow), the conventional
			// add-to-favourites affordance. The "star-off" (slashed) icon read as
			// "starring disabled", not "not yet starred".
			setIcon(starBtn, "star");
		}
	});

	// Point the combobox at the selected option so a screen reader announces it on
	// first render — not only after the first arrow key.
	const selectedRow = resultsEl.querySelector<HTMLElement>(".is-selected");
	if (selectedRow?.id) inputEl.setAttribute("aria-activedescendant", selectedRow.id);
	else inputEl.removeAttribute("aria-activedescendant");
	// Keep a preserved mid-list selection visible after a full re-render (a passive
	// metadata re-index can restore a non-zero selectedIndex). A fresh search resets
	// to 0, so this no-ops on the common path.
	if (ctx.selectedIndex > 0) selectedRow?.scrollIntoView({ block: "nearest" });
}

export interface RenderResultsContext extends ResultListContext {
	/** Empty-state placeholder + no-selection footer/preview reset (modal side). */
	renderEmptyState(icon: string, title: string, desc: string): void;
	/** Rebuild the footer chips for the freshly-selected row. */
	renderFooter(): void;
}

/**
 * Full results render: clears the list, shows the right empty state when there are
 * no rows, otherwise builds the row list + refreshes the footer. Returns the DOM's
 * new "selected row index" (the modal caches it so a selection move only restyles
 * two rows) — -1 when the list holds no real rows.
 */
export function renderResults(
	resultsEl: HTMLDivElement,
	inputEl: HTMLInputElement,
	ctx: RenderResultsContext
): number {
	resultsEl.empty();
	resultsEl.removeClass("vault-spotlight-loading");
	resultsEl.removeClass("is-searching");

	if (ctx.items.length === 0) {
		if (ctx.isEmptyQuery) {
			ctx.renderEmptyState(
				"files",
				"No notes in this vault yet",
				"Create a note and it will show up here instantly."
			);
		} else {
			ctx.renderEmptyState(
				"search",
				"No matches found",
				"Try a shorter query, fewer filters, or check your spelling."
			);
		}
		inputEl.removeAttribute("aria-activedescendant");
		return -1;
	}

	renderResultList(resultsEl, inputEl, ctx);
	// Refresh the footer for the freshly-selected row: after a new search or a Tab
	// mode switch the chips still described the previous item's kind. The footerSig
	// cache no-ops when unchanged.
	ctx.renderFooter();
	return ctx.selectedIndex;
}

export interface RowStateContext {
	items: ResultItem[];
	selectedIndex: number;
	checkedPaths: Set<string>;
	isPro: boolean;
}

/** Apply the selected + (Pro) multi-select checked state to a single row. Used to
 * restyle just the two rows a selection move touches, not the whole list. */
export function applyRowState(row: HTMLElement, index: number, ctx: RowStateContext): void {
	const selected = index === ctx.selectedIndex;
	row.toggleClass("is-selected", selected);
	row.setAttribute("aria-selected", String(selected));
	const item = ctx.items[index];
	const file = item ? itemFile(item) : null;
	if (file) {
		const checked = ctx.checkedPaths.has(file.path);
		row.toggleClass("is-checked", checked);
		// Expose per-row checked state so screen readers can tell which individual
		// rows are selected, not just an aggregate "N selected".
		if (ctx.isPro) row.setAttribute("aria-checked", String(checked));
	}
}

/**
 * Update the aria-live status ("N results" / "N selected" / "No results") and the
 * combobox's aria-expanded to reflect the real listbox state for assistive tech.
 */
export function renderStatus(
	statusEl: HTMLSpanElement | undefined,
	inputEl: HTMLInputElement | undefined,
	opts: { count: number; checkedSize: number }
): void {
	inputEl?.setAttribute("aria-expanded", opts.count > 0 ? "true" : "false");
	if (!statusEl) return;
	if (opts.checkedSize > 0) {
		statusEl.setText(`${opts.checkedSize} selected`);
		return;
	}
	if (opts.count === 0) {
		// Announce the zero-results transition instead of going silent — the
		// aria-live region is the only cue a screen-reader user gets.
		statusEl.setText("No results");
		return;
	}
	statusEl.setText(`${opts.count} result${opts.count === 1 ? "" : "s"}`);
}

/** Set the mode badge text and its content/Pro accent class. */
export function setModeBadge(badgeEl: HTMLElement, text: string, cls: "is-content" | "is-pro" | null): void {
	badgeEl.setText(text);
	badgeEl.removeClass("is-content");
	badgeEl.removeClass("is-pro");
	if (cls) badgeEl.addClass(cls);
}

/** Skeleton rows shown on the first render while the initial search runs. */
export function renderLoadingSkeletons(resultsEl: HTMLDivElement): void {
	resultsEl.empty();
	resultsEl.addClass("vault-spotlight-loading");
	// Mirror the real row (icon tile + title line + meta line) so the swap to
	// loaded content is seamless rather than a visible jump.
	for (let i = 0; i < 5; i++) {
		const row = resultsEl.createDiv({ cls: "vault-spotlight-skeleton" });
		row.createDiv({ cls: "vault-spotlight-skeleton-icon" });
		const lines = row.createDiv({ cls: "vault-spotlight-skeleton-lines" });
		lines.createDiv({ cls: "vault-spotlight-skeleton-line is-title" });
		lines.createDiv({ cls: "vault-spotlight-skeleton-line is-meta" });
	}
}

/** The "nothing here" placeholder (icon + title + description). */
export function renderEmptyStateInto(resultsEl: HTMLDivElement, icon: string, title: string, desc: string): void {
	resultsEl.empty();
	resultsEl.removeClass("vault-spotlight-loading");
	resultsEl.removeClass("is-searching");
	const empty = resultsEl.createDiv({ cls: "vault-spotlight-empty" });
	const iconWrap = empty.createDiv({ cls: "vault-spotlight-empty-icon" });
	setIcon(iconWrap, icon);
	iconWrap.setAttr("aria-hidden", "true");
	empty.createDiv({ cls: "vault-spotlight-empty-title", text: title });
	empty.createDiv({ cls: "vault-spotlight-empty-desc", text: desc });
}

export interface FooterShortcutContext {
	selected: ResultItem | null;
	defaultNewTab: boolean;
	isPro: boolean;
	modifierLabel: string;
}

/** Rebuild the footer's shortcut chips for the selected row's kind. */
export function renderFooterShortcuts(shortcutsEl: HTMLElement, ctx: FooterShortcutContext): void {
	shortcutsEl.empty();
	for (const hint of getShortcutHints({
		itemKind: ctx.selected?.kind ?? null,
		defaultNewTab: ctx.defaultNewTab,
		isPro: ctx.isPro,
		modifierLabel: ctx.modifierLabel,
	})) {
		addShortcut(shortcutsEl, hint.keys, hint.label);
	}
	// The context menu (Alt+Enter) only opens for rows backed by a file — gate the
	// chip on the same check the handler uses so it's never a dead key.
	if (ctx.selected && itemFile(ctx.selected)) addShortcut(shortcutsEl, ["Alt", "↵"], "menu");
}

function addShortcut(container: HTMLElement, keys: string[], label: string): void {
	const wrap = container.createSpan({ cls: "vault-spotlight-shortcut" });
	for (const key of keys) {
		wrap.createEl("kbd", { text: key });
	}
	wrap.appendText(` ${label}`);
}
