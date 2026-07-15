import { App, Component, MarkdownRenderer, Menu, TFile, setIcon } from "obsidian";
import { buildPreviewExcerpt } from "../core/previewWindow.mjs";
import { copyToClipboard } from "./batchOps";

/** Host hooks the pane needs from the modal (kept tiny, batchOps-style). */
export interface PreviewHost {
	/** Close the modal — called when the user follows an internal link. */
	close(): void;
}

/**
 * The Pro live-preview pane beside the results list: debounced rendering of
 * the highlighted note, scrolled to the first matched term. Links in the body
 * are clickable (internal links follow via the workspace, external links open
 * in the browser) and the header offers a copy menu — both so a Pro user can
 * act on a result without opening the note first.
 */
export class PreviewPane {
	private el: HTMLDivElement | null = null;
	private component: Component | null = null;
	private timer: number | null = null;
	// Bumped on every update() so a slower async read from an earlier selection
	// can't render into the pane after a newer selection replaced it.
	private token = 0;
	// The note currently rendered — the source path for resolving relative
	// internal links clicked in the body.
	private currentFile: TFile | null = null;

	constructor(
		private app: App,
		private host: PreviewHost
	) {}

	mount(parent: HTMLElement): void {
		this.el = parent.createDiv({ cls: "vault-spotlight-preview" });
		this.component = new Component();
		this.component.load();
		// One delegated listener on the persistent pane element (survives the
		// per-render .empty()/swap of its children) handles every link click.
		this.el.addEventListener("click", (evt) => this.handleLinkClick(evt));
	}

	get isMounted(): boolean {
		return this.el !== null && this.component !== null;
	}

	/** Debounced: render `file` (markdown only) and highlight/scroll to the relevant passage. */
	update(file: TFile | null, options: { terms?: string[]; focusText?: string } = {}): void {
		if (!this.el || !this.component) return;
		if (this.timer !== null) window.clearTimeout(this.timer);
		const previewEl = this.el;
		const component = this.component;
		const token = ++this.token;
		const terms = Array.isArray(options.terms) ? options.terms : [];
		const focusText = typeof options.focusText === "string" ? options.focusText : "";

		this.timer = window.setTimeout(() => {
			this.timer = null;
			// The empty/non-markdown states render instantly, so clearing up front
			// costs no visible flash.
			if (!file) {
				this.currentFile = null;
				previewEl.empty();
				renderPreviewEmpty(previewEl, "eye", "Nothing selected", "Pick a result and its note previews here, scrolled to the match.");
				return;
			}
			if (file.extension !== "md") {
				this.currentFile = null;
				previewEl.empty();
				renderPreviewEmpty(
					previewEl,
					"file-x",
					`No preview for ${file.extension.toUpperCase()} files`,
					"Live preview is available for Markdown notes. Press ↵ to open this file instead."
				);
				return;
			}
			// Stage the new preview in a DETACHED container and swap it in only once
			// its markdown has rendered. Arrowing between notes therefore never strobes
			// the pane empty→content — the previously-rendered note stays on screen
			// until the replacement is ready. The token/component/isConnected guards
			// still ensure a slower read from an older selection can't win the swap.
			const staged = previewEl.ownerDocument.createElement("div");
			const header = staged.createDiv({ cls: "vault-spotlight-preview-header" });
			header.createDiv({ cls: "vault-spotlight-preview-title", text: file.basename });
			// Copy menu: act on the note (contents / link / path) without opening it.
			const copyBtn = header.createEl("button", {
				cls: "vault-spotlight-preview-copy",
				attr: { "aria-label": "Copy…", title: "Copy…" },
			});
			setIcon(copyBtn, "copy");
			const bodyEl = staged.createDiv({ cls: "vault-spotlight-preview-body markdown-rendered" });
			void this.app.vault
				.cachedRead(file)
				.then((content) => {
					if (this.token !== token || this.component !== component || !previewEl.isConnected) return;
					// Wire the copy button to the just-read contents; the button node
					// survives the swap below, so this closure stays valid.
					copyBtn.onclick = (evt) => {
						evt.stopPropagation();
						this.showCopyMenu(evt, file, content);
					};
					const excerpt = buildPreviewExcerpt(content, { focusText, terms });
					return MarkdownRenderer.render(this.app, excerpt, bodyEl, file.path, component).then(() => content);
				})
				.then((content) => {
					if (this.token !== token || this.component !== component || !previewEl.isConnected) return;
					// Replacement is fully rendered — swap it in, then highlight/scroll
					// on the now-connected nodes so scrollIntoView actually moves.
					previewEl.empty();
					while (staged.firstChild) previewEl.appendChild(staged.firstChild);
					// Record what's on screen so link clicks resolve relative to it.
					this.currentFile = file;
					const hit = highlightFirstMatch(previewEl, [focusText, ...terms]);
					hit?.scrollIntoView({ block: "center" });
				})
				.catch(() => {
					if (this.token !== token || !previewEl.isConnected) return;
					this.currentFile = null;
					previewEl.empty();
					renderPreviewEmpty(previewEl, "alert-triangle", "Preview unavailable", "This note couldn't be read. Try selecting it again.");
				});
		}, 120);
	}

	/**
	 * Follow a link clicked in the rendered body. Internal links jump through the
	 * workspace (closing the modal, like activating a result); external links open
	 * in the browser. Anything else falls through to the default behavior.
	 */
	private handleLinkClick(evt: MouseEvent): void {
		const target = evt.target;
		if (!(target instanceof HTMLElement)) return;
		const anchor = target.closest("a");
		if (!anchor) return;

		if (anchor.classList.contains("internal-link")) {
			evt.preventDefault();
			// MarkdownRenderer resolves the display text into data-href; fall back to
			// href for links it didn't rewrite.
			const linktext = anchor.getAttribute("data-href") ?? anchor.getAttribute("href") ?? "";
			if (!linktext) return;
			const sourcePath = this.currentFile?.path ?? "";
			// New pane on Cmd/Ctrl-click, mirroring Obsidian's own link behavior.
			const newLeaf = evt.metaKey || evt.ctrlKey;
			this.host.close();
			void this.app.workspace.openLinkText(linktext, sourcePath, newLeaf);
			return;
		}

		if (anchor.classList.contains("external-link")) {
			evt.preventDefault();
			const href = anchor.getAttribute("href") ?? "";
			if (!/^https?:\/\//i.test(href)) return;
			// Open in the pane's own window so popout modals open links correctly.
			anchor.ownerDocument.defaultView?.open(href, "_blank");
		}
	}

	/** Copy menu for the previewed note: contents, a link to it, or its path. */
	private showCopyMenu(evt: MouseEvent, file: TFile, content: string): void {
		const menu = new Menu();
		menu.addItem((item) =>
			item
				.setTitle("Copy contents")
				.setIcon("clipboard-type")
				.onClick(() => copyToClipboard(content, "note contents copied"))
		);
		menu.addItem((item) =>
			item
				.setTitle("Copy link to note")
				.setIcon("link")
				// generateMarkdownLink honors the user's wikilink/markdown link setting.
				.onClick(() => copyToClipboard(this.app.fileManager.generateMarkdownLink(file, ""), "link copied"))
		);
		menu.addItem((item) =>
			item
				.setTitle("Copy path")
				.setIcon("folder")
				.onClick(() => copyToClipboard(file.path, "path copied"))
		);
		menu.showAtMouseEvent(evt);
	}

	unload(): void {
		if (this.timer !== null) {
			window.clearTimeout(this.timer);
			this.timer = null;
		}
		if (this.component) {
			this.component.unload();
			this.component = null;
		}
		// Remove the node too, so a later re-mount (e.g. a profile switch that
		// toggles preview back on) doesn't leave an orphaned pane behind.
		this.el?.remove();
		this.el = null;
		this.currentFile = null;
	}
}

/**
 * Rich empty/error state for the preview pane, mirroring the results list's own
 * empty state (icon tile + title + guidance) so a paid feature never shows a bare
 * line of faint text where a note would be.
 */
function renderPreviewEmpty(target: HTMLElement, icon: string, title: string, desc: string): void {
	const empty = target.createDiv({ cls: "vault-spotlight-empty" });
	const iconWrap = empty.createDiv({ cls: "vault-spotlight-empty-icon" });
	setIcon(iconWrap, icon);
	iconWrap.setAttr("aria-hidden", "true");
	empty.createDiv({ cls: "vault-spotlight-empty-title", text: title });
	empty.createDiv({ cls: "vault-spotlight-empty-desc", text: desc });
}

/**
 * Wraps the first occurrence of any term (case-insensitive) inside `root` in a
 * <mark> and returns it, or null if no term is found. Walks text nodes so it
 * marks rendered text without disturbing the surrounding markdown structure.
 */
function highlightFirstMatch(root: HTMLElement, terms: string[]): HTMLElement | null {
	const needles = terms.map((t) => t.toLowerCase()).filter((t) => t.length > 0);
	if (needles.length === 0) return null;

	// Use the element's own document, not the global one — the modal may live
	// in a popout window.
	const doc = root.ownerDocument;
	const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let node: Node | null;
	while ((node = walker.nextNode())) {
		const text = node.nodeValue ?? "";
		if (!text.trim()) continue;
		const low = text.toLowerCase();
		let idx = -1;
		let len = 0;
		for (const needle of needles) {
			const at = low.indexOf(needle);
			if (at !== -1 && (idx === -1 || at < idx)) {
				idx = at;
				len = needle.length;
			}
		}
		if (idx === -1) continue;

		const range = doc.createRange();
		range.setStart(node, idx);
		range.setEnd(node, idx + len);
		const mark = doc.createElement("mark");
		mark.className = "vault-spotlight-preview-hit";
		try {
			range.surroundContents(mark);
			return mark;
		} catch {
			return null;
		}
	}
	return null;
}
