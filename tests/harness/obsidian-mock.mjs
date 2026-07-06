// Fake of the subset of the `obsidian` module the plugin imports. It exists only
// so esbuild can bundle the real `src/**/*.ts` for a Node harness (see build.mjs).
// It implements REAL semantics for the metadata helpers (getAllTags /
// parseFrontMatterTags) and enough of Modal/Scope/Setting/DOM to actually RUN
// SpotlightModal.onOpen() and PromptModal, so the modal harness drives production
// code — not a re-implementation.
import { createDom, FakeEvent } from "./dom.mjs";

// One shared fake window+document for the whole harness run.
export const { window: harnessWindow, document: harnessDocument } = createDom();
export { FakeEvent };

export class TAbstractFile {}

export class TFile extends TAbstractFile {
	constructor(path, mtime = 0, ctime = 0) {
		super();
		this.path = path;
		const slash = path.lastIndexOf("/");
		const name = slash === -1 ? path : path.slice(slash + 1);
		const dot = name.lastIndexOf(".");
		this.name = name;
		this.extension = dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
		this.basename = dot === -1 ? name : name.slice(0, dot);
		this.stat = { mtime, ctime, size: 0 };
		this.parent = null;
	}
}

export class TFolder extends TAbstractFile {}
export class WorkspaceLeaf {}
export class App {}
export class Notice {
	// Record every notice so a journey test can assert on user-facing messages
	// (upgrade prompts, capture confirmations, "Pro required", …).
	static messages = [];
	static reset() {
		Notice.messages = [];
	}
	constructor(message) {
		this.message = message;
		if (message != null) Notice.messages.push(String(message));
	}
	setMessage(m) {
		this.message = m;
		if (m != null) Notice.messages.push(String(m));
		return this;
	}
	hide() {}
}
export const Platform = {
	isMacOS: process.platform === "darwin",
	isIosApp: false,
	isMobile: false,
	isDesktopOnly: false,
};

/** Obsidian's getAllTags: every tag on a note (inline + frontmatter), "#"-prefixed. */
export function getAllTags(cache) {
	if (!cache) return null;
	const out = [];
	for (const entry of cache.tags ?? []) out.push(entry.tag);
	for (const tag of parseFrontMatterTags(cache.frontmatter ?? null) ?? []) out.push(tag);
	return out;
}

/** Obsidian's parseFrontMatterTags: normalize `tags`/`tag` frontmatter to ["#a", …]. */
export function parseFrontMatterTags(frontmatter) {
	if (!frontmatter) return null;
	const raw = frontmatter.tags ?? frontmatter.tag;
	if (raw == null) return null;
	const list = Array.isArray(raw) ? raw : String(raw).split(/[,\s]+/);
	const tags = list
		.map((t) => String(t).trim())
		.filter(Boolean)
		.map((t) => (t.startsWith("#") ? t : `#${t}`));
	return tags.length > 0 ? tags : null;
}

// ---------------------------------------------------------------------------
// Modal / keyboard / UI surface — enough to run SpotlightModal.onOpen()
// ---------------------------------------------------------------------------

export function setIcon(el, name) {
	// Real Obsidian injects an SVG; the harness only needs the call to be safe.
	if (el?.setAttribute) el.setAttribute("data-icon", String(name));
}

export function normalizePath(p) {
	return String(p).replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/^\/+|\/+$/g, "");
}

/** Records key registrations so a test can find and invoke a shortcut handler. */
export class Scope {
	constructor() {
		this.keys = [];
	}
	register(modifiers, key, handler) {
		const binding = { modifiers: modifiers ?? [], key, handler };
		this.keys.push(binding);
		return binding;
	}
	unregister(binding) {
		this.keys = this.keys.filter((b) => b !== binding);
	}
}

/** Base Modal: builds the containerEl/modalEl/contentEl/titleEl tree in the fake DOM. */
export class Modal {
	static opened = [];
	constructor(app) {
		this.app = app;
		this.scope = new Scope();
		this.containerEl = harnessDocument.createElement("div");
		this.modalEl = this.containerEl.createDiv();
		this.titleEl = this.modalEl.createDiv();
		this.contentEl = this.modalEl.createDiv();
	}
	open() {
		harnessDocument.body.appendChild(this.containerEl);
		Modal.opened.push(this);
		this.onOpen();
	}
	close() {
		this.onClose();
		this.containerEl.remove();
		const i = Modal.opened.indexOf(this);
		if (i !== -1) Modal.opened.splice(i, 1);
	}
	onOpen() {}
	onClose() {}
}

class TextComponent {
	constructor(parent) {
		this.inputEl = parent.createEl("input", { type: "text" });
	}
	setValue(v) {
		this.inputEl.value = v;
		return this;
	}
	getValue() {
		return this.inputEl.value;
	}
	setPlaceholder(p) {
		this.inputEl.setAttribute("placeholder", p);
		return this;
	}
	onChange(cb) {
		this.inputEl.addEventListener("input", () => cb(this.inputEl.value));
		return this;
	}
	then(cb) {
		cb(this);
		return this;
	}
}

class ButtonComponent {
	constructor(parent) {
		this.buttonEl = parent.createEl("button");
	}
	setButtonText(t) {
		this.buttonEl.setText(t);
		return this;
	}
	setCta() {
		this.buttonEl.addClass("mod-cta");
		return this;
	}
	setIcon() {
		return this;
	}
	setTooltip() {
		return this;
	}
	setDisabled() {
		return this;
	}
	onClick(cb) {
		this.buttonEl.addEventListener("click", () => cb());
		return this;
	}
}

/** Enough of Setting for PromptModal (addText + addButton). Layout methods are
 * chainable no-ops — the settings TAB's display() is never invoked in the harness. */
export class Setting {
	constructor(containerEl) {
		this.settingEl = containerEl.createDiv({ cls: "setting-item" });
		this.infoEl = this.settingEl.createDiv();
		this.nameEl = this.infoEl.createDiv();
		this.descEl = this.infoEl.createDiv();
		this.controlEl = this.settingEl.createDiv();
	}
	setName(v) {
		this.nameEl.setText(v);
		return this;
	}
	setDesc(v) {
		this.descEl.setText(v);
		return this;
	}
	setHeading() {
		this.settingEl.addClass("setting-item-heading");
		return this;
	}
	setClass() {
		return this;
	}
	addText(cb) {
		cb(new TextComponent(this.controlEl));
		return this;
	}
	addButton(cb) {
		cb(new ButtonComponent(this.controlEl));
		return this;
	}
	addExtraButton(cb) {
		cb(new ButtonComponent(this.controlEl));
		return this;
	}
	addToggle(cb) {
		cb({ setValue: () => ({ onChange: () => {} }), onChange: () => {} });
		return this;
	}
	addDropdown(cb) {
		cb({ addOption: () => ({}), setValue: () => ({ onChange: () => {} }), onChange: () => {} });
		return this;
	}
	addTextArea(cb) {
		cb(new TextComponent(this.controlEl));
		return this;
	}
}

export class Menu {
	constructor() {
		this.items = [];
	}
	addItem(cb) {
		const item = {
			setTitle: () => item,
			setIcon: () => item,
			setDisabled: () => item,
			setChecked: () => item,
			onClick: () => item,
		};
		cb(item);
		this.items.push(item);
		return this;
	}
	addSeparator() {
		return this;
	}
	showAtMouseEvent() {}
	showAtPosition() {}
	hide() {}
}

export class Component {
	load() {}
	onload() {}
	unload() {}
	onunload() {}
	addChild(c) {
		return c;
	}
	removeChild(c) {
		return c;
	}
	register() {}
	registerEvent() {}
	registerDomEvent(el, type, cb) {
		el?.addEventListener?.(type, cb);
	}
}

export class MarkdownView {}
export class PluginSettingTab {
	constructor(app, plugin) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = harnessDocument.createElement("div");
	}
	display() {}
	hide() {}
}

export const MarkdownRenderer = {
	render: () => Promise.resolve(),
	renderMarkdown: () => Promise.resolve(),
};

/** Minimal callable `moment` — only date-jump/capture use it, which the harness
 * doesn't drive; it just has to import and be callable. */
export function moment() {
	const self = {
		format: () => "",
		add: () => self,
		subtract: () => self,
		startOf: () => self,
		endOf: () => self,
		isValid: () => true,
		toDate: () => new Date(0),
		valueOf: () => 0,
		clone: () => self,
	};
	return self;
}
