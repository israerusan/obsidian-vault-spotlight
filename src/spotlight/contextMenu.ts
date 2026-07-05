// The right-click / Alt+Enter context menu for a file-backed result. Extracted from
// SpotlightModal.openActionsMenu so the menu construction is isolated; the modal
// supplies a small host of bound operations. Builds an Obsidian Menu — the only
// DOM-adjacent piece here — from fixed items.
import { Menu, type App, type WorkspaceLeaf } from "obsidian";
import { itemFile, type ResultItem } from "./resultTypes";
import * as batchOps from "./batchOps";

export interface ContextMenuHost {
	app: App;
	close(): void;
	trackRecent(path: string): void;
	seekToItemLine(leaf: WorkspaceLeaf, item: ResultItem): void;
	/** Bounding rect of the selected row, for keyboard-invoked positioning. */
	selectedRowRect(): { left: number; bottom: number } | null;
}

export function openResultContextMenu(item: ResultItem, evt: MouseEvent | undefined, host: ContextMenuHost): void {
	const file = itemFile(item);
	if (!file) return;
	const menu = new Menu();

	// Seek to the matched line for anything that carries one, so opening a
	// symbol/heading/content hit via the menu lands on the passage — matching Enter.
	const openIn = (paneType: "tab" | "split" | "window") => {
		host.close();
		void (async () => {
			const leaf = host.app.workspace.getLeaf(paneType);
			await leaf.openFile(file);
			host.seekToItemLine(leaf, item);
			host.trackRecent(file.path);
		})();
	};

	menu.addItem((i) => i.setTitle("Open in new tab").setIcon("file-plus").onClick(() => openIn("tab")));
	menu.addItem((i) => i.setTitle("Open to the right").setIcon("separator-vertical").onClick(() => openIn("split")));
	menu.addItem((i) => i.setTitle("Open in new window").setIcon("picture-in-picture-2").onClick(() => openIn("window")));
	menu.addSeparator();
	menu.addItem((i) =>
		i
			.setTitle("Copy Obsidian link")
			.setIcon("link")
			.onClick(() => batchOps.copyToClipboard(host.app.fileManager.generateMarkdownLink(file, ""), "Link copied"))
	);
	menu.addItem((i) => i.setTitle("Copy path").setIcon("copy").onClick(() => batchOps.copyToClipboard(file.path, "Path copied")));
	menu.addItem((i) => i.setTitle("Rename…").setIcon("pencil").onClick(() => batchOps.renameFile(host.app, file)));

	const showInFolder = (host.app as unknown as { showInFolder?: (p: string) => void }).showInFolder;
	if (typeof showInFolder === "function") {
		menu.addItem((i) =>
			i
				.setTitle("Show in system explorer")
				.setIcon("folder-open")
				.onClick(() => {
					showInFolder.call(host.app, file.path);
				})
		);
	}

	if (evt) {
		menu.showAtMouseEvent(evt);
	} else {
		const rect = host.selectedRowRect();
		if (rect) menu.showAtPosition({ x: rect.left + 40, y: rect.bottom });
		else menu.showAtPosition({ x: 100, y: 100 });
	}
}
