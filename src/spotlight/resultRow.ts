import { setIcon } from "obsidian";
import { renderHighlightedText } from "../search/fuzzy";
import { getVaultFileKind, iconForFileKind } from "../search/vaultFiles";
import { iconForSymbolType } from "../search/SymbolSearcher";
import { buildFileDecorations } from "../core/resultDecorators.mjs";
import { capitalize, type ResultItem } from "./resultTypes";

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
	} else if (item.kind === "workflow") {
		setIcon(iconWrap, item.isPinned ? "sparkles" : "play-circle");
		title.setText(item.name);
		titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: item.isStarter ? "Starter workflow" : "Workflow" });
		if (item.rankingMode) {
			titleRow.createSpan({ cls: "vault-spotlight-item-badge is-type", text: item.rankingMode });
		}
		body.createDiv({ cls: "vault-spotlight-item-meta", text: `${item.mode}${item.query ? ` · ${item.query}` : ""}` });
	} else if (item.kind === "action") {
		setIcon(iconWrap, item.action.requiresPro ? "sparkles" : "bolt");
		title.setText(item.action.name);
		titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: item.action.requiresPro ? "Pro action" : "Action" });
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
			cls: item.exists ? "vault-spotlight-item-badge is-active" : "vault-spotlight-item-badge is-action",
			text: item.exists ? "Daily note" : "Create daily note",
		});
		body.createDiv({ cls: "vault-spotlight-item-meta", text: item.path });
	} else if (item.kind === "capture") {
		setIcon(iconWrap, "plus-circle");
		title.setText(item.text || "Type something to capture…");
		titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: item.label });
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
