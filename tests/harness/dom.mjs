// A focused fake DOM good enough to run the REAL SpotlightModal.onOpen() render
// and a PromptModal, in Node. Implements the Obsidian HTMLElement extensions the
// plugin actually uses (createEl/createDiv/setText/addClass/…), plus a small
// querySelector/closest that understands simple compound selectors (tag#id.class).
// NOT a general DOM — only what the modal touches. Selector combinators, ranges,
// layout metrics, etc. are intentionally out of scope.

let idCounter = 0;

function parseSelector(sel) {
	// "div#id.a.b" -> { tag, id, classes }. No combinators.
	const s = sel.trim();
	const idMatch = s.match(/#([A-Za-z0-9_-]+)/);
	const classes = [...s.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
	const tagMatch = s.match(/^([A-Za-z][A-Za-z0-9]*)/);
	return { tag: tagMatch ? tagMatch[1].toLowerCase() : null, id: idMatch ? idMatch[1] : null, classes };
}

class FakeEvent {
	constructor(type, props = {}) {
		this.type = type;
		this.defaultPrevented = false;
		this.propagationStopped = false;
		this.target = null;
		this.currentTarget = null;
		Object.assign(this, props);
	}
	preventDefault() {
		this.defaultPrevented = true;
	}
	stopPropagation() {
		this.propagationStopped = true;
	}
	stopImmediatePropagation() {
		this.propagationStopped = true;
	}
}

class ClassList {
	constructor(el) {
		this._set = new Set();
		this._el = el;
	}
	add(...cls) {
		for (const c of cls) if (c) this._set.add(c);
	}
	remove(...cls) {
		for (const c of cls) this._set.delete(c);
	}
	toggle(cls, force) {
		const has = this._set.has(cls);
		const want = force === undefined ? !has : force;
		if (want) this._set.add(cls);
		else this._set.delete(cls);
		return want;
	}
	contains(cls) {
		return this._set.has(cls);
	}
	get value() {
		return [...this._set].join(" ");
	}
}

export class FakeElement {
	constructor(tag, ownerDocument) {
		this.tagName = String(tag).toUpperCase();
		this.ownerDocument = ownerDocument;
		this.childNodes = [];
		this.parentNode = null;
		this.classList = new ClassList(this);
		this.dataset = {};
		this.style = { setProperty() {}, removeProperty() {}, getPropertyValue: () => "" };
		this.attributes = new Map();
		this.offsetHeight = 0;
		this.offsetWidth = 0;
		this.offsetTop = 0;
		this.scrollTop = 0;
		this.scrollHeight = 0;
		this.clientHeight = 0;
		this._text = "";
		this._listeners = new Map();
		this.id = "";
		this._value = "";
		this.checked = false;
		this.selectionStart = 0;
		this.selectionEnd = 0;
		this._uid = ++idCounter;
	}

	// --- tree ---
	get children() {
		return this.childNodes.slice();
	}
	get parentElement() {
		return this.parentNode;
	}
	get firstChild() {
		return this.childNodes[0] ?? null;
	}
	get win() {
		return this.ownerDocument.defaultView;
	}
	get doc() {
		return this.ownerDocument;
	}
	get isConnected() {
		let n = this;
		while (n) {
			if (n === this.ownerDocument.body || n === this.ownerDocument.documentElement) return true;
			n = n.parentNode;
		}
		return false;
	}

	appendChild(child) {
		child.parentNode = this;
		this.childNodes.push(child);
		return child;
	}
	insertBefore(child, ref) {
		child.parentNode = this;
		const i = ref ? this.childNodes.indexOf(ref) : -1;
		if (i === -1) this.childNodes.push(child);
		else this.childNodes.splice(i, 0, child);
		return child;
	}
	removeChild(child) {
		const i = this.childNodes.indexOf(child);
		if (i !== -1) this.childNodes.splice(i, 1);
		child.parentNode = null;
		return child;
	}
	remove() {
		this.parentNode?.removeChild(this);
	}
	detach() {
		this.remove();
	}
	empty() {
		for (const c of this.childNodes) c.parentNode = null;
		this.childNodes = [];
		this._text = "";
	}
	replaceChildren() {
		this.empty();
	}

	// --- creation (Obsidian helpers) ---
	createEl(tag, opts = {}, callback) {
		const el = this.ownerDocument.createElement(tag);
		if (typeof opts === "string") opts = { cls: opts };
		if (opts.cls) {
			const classes = Array.isArray(opts.cls) ? opts.cls : String(opts.cls).split(/\s+/);
			el.classList.add(...classes.filter(Boolean));
		}
		if (opts.text != null) el.setText(String(opts.text));
		if (opts.type != null) el.setAttribute("type", opts.type);
		if (opts.href != null) el.setAttribute("href", opts.href);
		if (opts.value != null) el.value = String(opts.value);
		if (opts.placeholder != null) el.setAttribute("placeholder", opts.placeholder);
		if (opts.title != null) el.setAttribute("title", opts.title);
		if (opts.attr) for (const [k, v] of Object.entries(opts.attr)) el.setAttribute(k, String(v));
		if (opts.prepend) this.insertBefore(el, this.firstChild);
		else this.appendChild(el);
		if (callback) callback(el);
		return el;
	}
	createDiv(opts, cb) {
		return this.createEl("div", opts, cb);
	}
	createSpan(opts, cb) {
		return this.createEl("span", opts, cb);
	}
	createSvg(tag, opts) {
		return this.createEl(tag, opts);
	}

	// --- text ---
	get textContent() {
		return this._text + this.childNodes.map((c) => c.textContent ?? "").join("");
	}
	set textContent(v) {
		this.empty();
		this._text = v == null ? "" : String(v);
	}
	setText(v) {
		this.textContent = v;
		return this;
	}
	appendText(v) {
		this._text += v == null ? "" : String(v);
		return this;
	}

	// --- classes ---
	addClass(...cls) {
		this.classList.add(...cls);
		return this;
	}
	removeClass(...cls) {
		this.classList.remove(...cls);
		return this;
	}
	toggleClass(cls, force) {
		this.classList.toggle(cls, force);
		return this;
	}
	hasClass(cls) {
		return this.classList.contains(cls);
	}
	get className() {
		return this.classList.value;
	}

	// --- attributes ---
	setAttribute(name, value) {
		this.attributes.set(name, String(value));
		if (name === "id") this.id = String(value);
	}
	setAttr(name, value) {
		this.setAttribute(name, value);
		return this;
	}
	getAttribute(name) {
		return this.attributes.has(name) ? this.attributes.get(name) : null;
	}
	getAttr(name) {
		return this.getAttribute(name);
	}
	hasAttribute(name) {
		return this.attributes.has(name);
	}
	removeAttribute(name) {
		this.attributes.delete(name);
	}

	// --- form fields ---
	get value() {
		return this._value;
	}
	set value(v) {
		this._value = v == null ? "" : String(v);
	}
	setSelectionRange(a, b) {
		this.selectionStart = a;
		this.selectionEnd = b;
	}
	select() {
		this.selectionStart = 0;
		this.selectionEnd = this._value.length;
	}
	focus() {
		this.ownerDocument.activeElement = this;
	}
	blur() {
		if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = this.ownerDocument.body;
	}
	scrollIntoView() {}

	// --- events ---
	addEventListener(type, cb) {
		if (!this._listeners.has(type)) this._listeners.set(type, []);
		this._listeners.get(type).push(cb);
	}
	removeEventListener(type, cb) {
		const arr = this._listeners.get(type);
		if (arr) this._listeners.set(type, arr.filter((f) => f !== cb));
	}
	dispatchEvent(evt) {
		if (!(evt instanceof FakeEvent)) evt = new FakeEvent(evt.type, evt);
		evt.target = evt.target ?? this;
		let node = this;
		while (node) {
			evt.currentTarget = node;
			for (const cb of node._listeners.get(evt.type) ?? []) {
				cb(evt);
				if (evt.propagationStopped) return !evt.defaultPrevented;
			}
			node = node.parentNode;
		}
		return !evt.defaultPrevented;
	}

	// --- selectors (simple compound only) ---
	matches(sel) {
		const { tag, id, classes } = parseSelector(sel);
		if (tag && this.tagName.toLowerCase() !== tag) return false;
		if (id && this.id !== id) return false;
		return classes.every((c) => this.classList.contains(c));
	}
	closest(sel) {
		let node = this;
		while (node) {
			if (node.matches?.(sel)) return node;
			node = node.parentNode;
		}
		return null;
	}
	querySelector(sel) {
		return this._find(sel, true)[0] ?? null;
	}
	querySelectorAll(sel) {
		return this._find(sel, false);
	}
	find(sel) {
		return this.querySelector(sel);
	}
	findAll(sel) {
		return this.querySelectorAll(sel);
	}
	getBoundingClientRect() {
		return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
	}
	show() {
		this.style.display = "";
	}
	hide() {
		this.style.display = "none";
	}
	setCssStyles() {}
	toggleVisibility(v) {
		this.style.display = v ? "" : "none";
	}
	_find(sel, first) {
		const out = [];
		const walk = (node) => {
			for (const child of node.childNodes) {
				if (child.matches?.(sel)) {
					out.push(child);
					if (first) return true;
				}
				if (walk(child)) return true;
			}
			return false;
		};
		walk(this);
		return out;
	}
}

class FakeDocument {
	constructor() {
		this.documentElement = new FakeElement("html", this);
		this.body = new FakeElement("body", this);
		this.documentElement.appendChild(this.body);
		this.body.parentNode = this.documentElement;
		this.activeElement = this.body;
		this.defaultView = null;
	}
	createElement(tag) {
		return new FakeElement(tag, this);
	}
}

/** Build a fresh fake window+document, wired to real timers (so debounce works). */
export function createDom() {
	const document = new FakeDocument();
	const window = {
		document,
		setTimeout: (fn, ms) => setTimeout(fn, ms),
		clearTimeout: (id) => clearTimeout(id),
		setInterval: (fn, ms) => setInterval(fn, ms),
		clearInterval: (id) => clearInterval(id),
		requestAnimationFrame: (fn) => setTimeout(() => fn(Date.now()), 0),
		cancelAnimationFrame: (id) => clearTimeout(id),
		getComputedStyle: () => ({ getPropertyValue: () => "" }),
	};
	document.defaultView = window;
	return { window, document };
}

export { FakeEvent };
