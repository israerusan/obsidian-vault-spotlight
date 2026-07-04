import { App, Component, MarkdownRenderer, TFile, setIcon } from "obsidian";
import { buildPreviewExcerpt } from "../core/previewWindow.mjs";

/**
 * The Pro live-preview pane beside the results list: debounced rendering of
 * the highlighted note, scrolled to the first matched term.
 */
export class PreviewPane {
	private el: HTMLDivElement | null = null;
	private component: Component | null = null;
	private timer: number | null = null;
	// Bumped on every update() so a slower async read from an earlier selection
	// can't render into the pane after a newer selection replaced it.
	private token = 0;

	constructor(private app: App) {}

	mount(parent: HTMLElement): void {
		this.el = parent.createDiv({ cls: "vault-spotlight-preview" });
		this.component = new Component();
		this.component.load();
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
			previewEl.empty();
			if (!file) {
				renderPreviewEmpty(previewEl, "eye", "Nothing selected", "Pick a result and its note previews here, scrolled to the match.");
				return;
			}
			if (file.extension !== "md") {
				renderPreviewEmpty(
					previewEl,
					"file-x",
					`No preview for ${file.extension.toUpperCase()} files`,
					"Live preview is available for Markdown notes. Press ↵ to open this file instead."
				);
				return;
			}
			previewEl.createDiv({ cls: "vault-spotlight-preview-title", text: file.basename });
			const bodyEl = previewEl.createDiv({ cls: "vault-spotlight-preview-body markdown-rendered" });
			void this.app.vault
				.cachedRead(file)
				.then((content) => {
					if (this.token !== token || this.component !== component || !previewEl.isConnected) return;
					const excerpt = buildPreviewExcerpt(content, { focusText, terms });
					return MarkdownRenderer.render(this.app, excerpt, bodyEl, file.path, component);
				})
				.then(() => {
					if (this.token !== token || this.component !== component || !bodyEl.isConnected) return;
					const hit = highlightFirstMatch(bodyEl, [focusText, ...terms]);
					hit?.scrollIntoView({ block: "center" });
				})
				.catch(() => {
					if (this.token !== token || !previewEl.isConnected) return;
					previewEl.empty();
					renderPreviewEmpty(previewEl, "alert-triangle", "Preview unavailable", "This note couldn't be read. Try selecting it again.");
				});
		}, 120);
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
