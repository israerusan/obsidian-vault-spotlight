// Loads a real on-disk fixture vault into a fake Obsidian `App`: an in-memory
// Vault (file list + cachedRead) and a MetadataCache built by actually parsing the
// markdown (frontmatter, headings, inline tags, links). Runs inside the bundle so
// its TFile instances are the SAME class the searchers import (instanceof checks).
import fs from "node:fs";
import path from "node:path";
import { TFile } from "obsidian";

function walk(dir, base, out) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const abs = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(abs, base, out);
		} else if (entry.isFile()) {
			const rel = path.relative(base, abs).split(path.sep).join("/");
			out.push({ rel, abs });
		}
	}
}

/** Minimal YAML-ish frontmatter: scalars, inline [a, b] arrays, and `- item` blocks. */
function parseFrontmatter(lines) {
	const fm = {};
	let lastKey = null;
	for (const line of lines) {
		const listItem = line.match(/^\s*-\s+(.*)$/);
		if (listItem && lastKey) {
			if (!Array.isArray(fm[lastKey])) fm[lastKey] = [];
			fm[lastKey].push(stripQuotes(listItem[1].trim()));
			continue;
		}
		const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
		if (!kv) continue;
		const key = kv[1];
		const value = kv[2].trim();
		lastKey = key;
		if (value === "") {
			fm[key] = []; // a block list (`- item` lines) may follow
		} else if (value.startsWith("[") && value.endsWith("]")) {
			fm[key] = value
				.slice(1, -1)
				.split(",")
				.map((v) => stripQuotes(v.trim()))
				.filter((v) => v.length > 0);
		} else {
			fm[key] = stripQuotes(value);
		}
	}
	return fm;
}

function stripQuotes(v) {
	if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
		return v.slice(1, -1);
	}
	return v;
}

function pos(line) {
	return { start: { line, col: 0, offset: 0 }, end: { line, col: 0, offset: 0 } };
}

/** Parse markdown into an Obsidian-shaped CachedMetadata. */
export function parseMarkdown(content) {
	const lines = content.split("\n");
	let bodyStart = 0;
	let frontmatter;
	if (lines[0] === "---") {
		const end = lines.indexOf("---", 1);
		if (end !== -1) {
			frontmatter = parseFrontmatter(lines.slice(1, end));
			bodyStart = end + 1;
		}
	}

	const headings = [];
	const tags = [];
	const links = [];
	for (let i = bodyStart; i < lines.length; i++) {
		const line = lines[i];
		const h = line.match(/^(#{1,6})\s+(.+?)\s*$/);
		if (h) {
			headings.push({ heading: h[2], level: h[1].length, position: pos(i) });
			continue;
		}
		for (const m of line.matchAll(/(?:^|\s)#([A-Za-z0-9][A-Za-z0-9_/-]*)/g)) {
			tags.push({ tag: `#${m[1]}`, position: pos(i) });
		}
		for (const m of line.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)) {
			links.push({ link: m[1].trim(), displayText: (m[2] ?? m[1]).trim(), original: m[0], position: pos(i) });
		}
	}

	const cache = { headings, tags, links, embeds: [], blocks: {}, sections: [] };
	if (frontmatter) cache.frontmatter = frontmatter;
	return cache;
}

/**
 * Build a fake `App` over a fixture vault directory.
 * @param {string} vaultDir absolute path to the fixture vault root
 */
export function loadVaultApp(vaultDir) {
	const found = [];
	walk(vaultDir, vaultDir, found);
	found.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));

	const files = [];
	const byPath = new Map();
	const contentByPath = new Map();
	const cacheByPath = new Map();
	let mtime = 1_000_000; // deterministic, ascending

	for (const { rel, abs } of found) {
		const content = fs.readFileSync(abs, "utf8");
		const file = new TFile(rel, (mtime += 1000), 900_000);
		files.push(file);
		byPath.set(rel, file);
		contentByPath.set(rel, content);
		if (file.extension === "md") cacheByPath.set(rel, parseMarkdown(content));
	}

	const noop = () => {};
	const openedFiles = [];
	const leaf = {
		openFile: (file) => {
			openedFiles.push(file);
			return Promise.resolve();
		},
		setViewState: () => Promise.resolve(),
		view: null,
	};
	const app = {
		openedFiles, // test-visible record of workspace.openFile() calls
		vault: {
			getFiles: () => files.slice(),
			getMarkdownFiles: () => files.filter((f) => f.extension === "md"),
			getAbstractFileByPath: (p) => byPath.get(p) ?? null,
			cachedRead: (file) => Promise.resolve(contentByPath.get(file.path) ?? ""),
			read: (file) => Promise.resolve(contentByPath.get(file.path) ?? ""),
			adapter: { basePath: vaultDir },
			on: () => ({}),
			off: noop,
			offref: noop,
		},
		metadataCache: {
			getFileCache: (file) => cacheByPath.get(file.path) ?? null,
			getCache: (p) => cacheByPath.get(p) ?? null,
			on: () => ({}),
			offref: noop,
		},
		workspace: {
			getActiveFile: () => null,
			getMostRecentLeaf: () => leaf,
			getLeaf: () => leaf,
			iterateAllLeaves: noop,
			setActiveLeaf: noop,
			revealLeaf: () => Promise.resolve(),
			getActiveViewOfType: () => null,
			on: () => ({}),
			offref: noop,
		},
	};
	return { app, files, byPath };
}
