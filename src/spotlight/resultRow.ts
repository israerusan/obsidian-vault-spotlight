import { setIcon } from "obsidian";
import { renderHighlightedText } from "../search/fuzzy";
import { getVaultFileKind, iconForFileKind } from "../search/vaultFiles";
import { iconForSymbolType } from "../search/SymbolSearcher";
import { capitalize, type ResultItem } from "./resultTypes";

export interface ResultRowOptions {
	isEmptyQuery: boolean;
	showModifiedTime: boolean;
}

/**
 * Fill one result row's icon, title, badges, and meta line for its item kind.
 * Selection state, checkboxes, star buttons, and listeners stay in the modal —
 * this renders only the item's content.
 */
export function renderResultRow(
	row: HTMLDivElement,
	item: ResultItem,
	options: ResultRowOptions
): void {
	const iconWrap = row.createDiv({ cls: "vault-spotlight-item-icon-wrap" });
	const body = row.createDiv({ cls: "vault-spotlight-item-body" });
	const titleRow = body.createDiv({ cls: "vault-spotlight-item-title-row" });
	const title = titleRow.createDiv({ cls: "vault-spotlight-item-title" });

	if (item.kind === "file") {
		setIcon(iconWrap, iconForFileKind(item.fileKind));
		row.toggleClass("is-starred", item.isStarred);
		renderHighlightedText(title, item.file.basename, item.matchIndices);
		if (item.isStarred && !options.isEmptyQuery) {
			titleRow.createSpan({ cls: "vault-spotlight-item-badge is-star", text: "Starred" });
		} else if (item.isBookmarked && !options.isEmptyQuery) {
			titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: "Bookmark" });
		} else if (item.isRecent && !options.isEmptyQuery) {
			titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: "Recent" });
		}
		if (item.fileKind !== "markdown") {
			titleRow.createSpan({
				cls: "vault-spotlight-item-badge is-type",
				text: item.fileKind.toUpperCase(),
			});
		}
		if (options.showModifiedTime) {
			titleRow.createSpan({ cls: "vault-spotlight-item-time", text: item.modifiedLabel });
		}
		body.createDiv({ cls: "vault-spotlight-item-meta", text: item.file.parent?.path || "/" });
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
			titleRow.createSpan({ cls: "vault-spotlight-item-badge is-star", text: "Active" });
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
	} else if (item.kind === "action") {
		setIcon(iconWrap, item.action.requiresPro ? "sparkles" : "bolt");
		title.setText(item.action.name);
		titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: item.action.requiresPro ? "Pro action" : "Action" });
		body.createDiv({ cls: "vault-spotlight-item-meta", text: item.action.description });
	} else {
		setIcon(iconWrap, "file-plus");
		title.setText(`Create “${item.name}”`);
		titleRow.createSpan({ cls: "vault-spotlight-item-badge is-star", text: "New" });
		body.createDiv({ cls: "vault-spotlight-item-meta", text: "Create a new note" });
	}
}
