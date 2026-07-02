import { App, Component, MarkdownRenderer, TFile } from "obsidian";

/**
 * The Pro live-preview pane beside the results list: debounced rendering of
 * the highlighted note, scrolled to the first matched term.
 */
export class PreviewPane {
	private el: HTMLDivElement | null = null;
	private component: Component | null = null;
	private timer: number | null = null;

	constructor(private app: App) {}

	mount(parent: HTMLElement): void {
		this.el = parent.createDiv({ cls: "vault-spotlight-preview" });
		this.component = new Component();
		this.component.load();
	}

	get isMounted(): boolean {
		return this.el !== null && this.component !== null;
	}

	/** Debounced: render `file` (markdown only) and highlight/scroll to `terms`. */
	update(file: TFile | null, terms: string[]): void {
		if (!this.el || !this.component) return;
		if (this.timer !== null) window.clearTimeout(this.timer);
		const previewEl = this.el;
		const component = this.component;

		this.timer = window.setTimeout(() => {
			this.timer = null;
			previewEl.empty();
			if (!file) {
				previewEl.createDiv({ cls: "vault-spotlight-preview-empty", text: "No preview" });
				return;
			}
			if (file.extension !== "md") {
				previewEl.createDiv({
					cls: "vault-spotlight-preview-empty",
					text: `${file.extension.toUpperCase()} file — no preview`,
				});
				return;
			}
			previewEl.createDiv({ cls: "vault-spotlight-preview-title", text: file.basename });
			const bodyEl = previewEl.createDiv({ cls: "vault-spotlight-preview-body markdown-rendered" });
			void this.app.vault
				.cachedRead(file)
				.then((content) => {
					if (this.component !== component || !previewEl.isConnected) return;
					return MarkdownRenderer.render(this.app, content.slice(0, 10000), bodyEl, file.path, component);
				})
				.then(() => {
					if (this.component !== component || !bodyEl.isConnected) return;
					// Scroll the matched term into view and mark it, so a content or
					// heading hit lands on the relevant passage instead of the top.
					const hit = highlightFirstMatch(bodyEl, terms);
					hit?.scrollIntoView({ block: "center" });
				})
				.catch(() => {
					previewEl.empty();
					previewEl.createDiv({ cls: "vault-spotlight-preview-empty", text: "Preview unavailable" });
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
		this.el = null;
	}
}

/**
 * Wraps the first occurrence of any term (case-insensitive) inside `root` in a
 * <mark> and returns it, or null if no term is found. Walks text nodes so it
 * marks rendered text without disturbing the surrounding markdown structure.
 */
function highlightFirstMatch(root: HTMLElement, terms: string[]): HTMLElement | null {
	const needles = terms.map((t) => t.toLowerCase()).filter((t) => t.length > 0);
	if (needles.length === 0) return null;

	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
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

		const range = document.createRange();
		range.setStart(node, idx);
		range.setEnd(node, idx + len);
		const mark = document.createElement("mark");
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
