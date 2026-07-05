// Minimal, honest fake of the subset of the `obsidian` module the SEARCH layer
// imports. It exists only so esbuild can bundle the real `src/search/*.ts` for a
// Node harness (see build.mjs). It intentionally implements REAL semantics for the
// two metadata helpers the code relies on (getAllTags / parseFrontMatterTags) so
// the exercised behavior matches production, not a stub.

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
export class Component {
	load() {}
	unload() {}
	registerEvent() {}
}
export class Notice {
	constructor(message) {
		this.message = message;
	}
	setMessage(m) {
		this.message = m;
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
