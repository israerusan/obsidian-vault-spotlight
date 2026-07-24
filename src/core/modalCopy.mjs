/**
 * Small, pure helpers for user-facing copy and keyboard behavior in the
 * Spotlight modal. Keeping them here lets us test UX truthfulness without
 * spinning up Obsidian UI objects.
 */

import { PRO_ONLY_MODES } from "./featureGates.mjs";

const MODE_ORDER = ["files", "content", "headings", "symbols", "commands", "links", "editors", "folders", "capture", "snippets"];

function normalizeHeading(heading) {
	return String(heading ?? "")
		.replace(/^#+\s*/, "")
		.trim();
}

function unique(values) {
	return [...new Set(values.filter(Boolean))];
}

export function getModifierLabel(platform = "") {
	return /mac|iphone|ipad|ipod/i.test(String(platform)) ? "Cmd" : "Ctrl";
}

/**
 * Describe where a capture will land, matching the real insertCapture logic:
 * heading placement wins over prepend/append mode.
 */
export function describeCaptureTarget({ hasText, targetLabel, mode = "append", heading = "" }) {
	if (!hasText) return "Type a note, then press Enter to capture";
	const cleanHeading = normalizeHeading(heading);
	if (cleanHeading) return `Capture under ${cleanHeading} in ${targetLabel}`;
	return `${mode === "prepend" ? "Prepend to" : "Append to"} ${targetLabel}`;
}

export function getAvailableModeOrder({ isPro = false } = {}) {
	return MODE_ORDER.filter((mode) => isPro || !PRO_ONLY_MODES.has(mode));
}

export function cycleMode(currentMode, { isPro = false, direction = 1 } = {}) {
	const available = getAvailableModeOrder({ isPro });
	if (available.length === 0) return currentMode;
	const startIndex = available.indexOf(currentMode);
	const index = startIndex === -1 ? 0 : startIndex;
	const step = direction >= 0 ? 1 : -1;
	return available[(index + step + available.length) % available.length];
}

/**
 * When drill-in is armed, decide whether the current query buffer means:
 * - exact symbols/links trigger -> drill now
 * - a partial multi-char trigger -> wait for another char
 * - normal text -> search normally
 */
export function getDrillPrefixMatch(rawQuery, prefixes) {
	const query = String(rawQuery ?? "");
	if (!query) return { mode: null, pending: false };
	const candidates = unique([prefixes?.symbols, prefixes?.links]);
	for (const prefix of candidates) {
		if (query === prefix) {
			return {
				mode: prefix === prefixes?.symbols ? "symbols" : prefix === prefixes?.links ? "links" : null,
				pending: false,
			};
		}
	}
	const pending = candidates.some((prefix) => typeof prefix === "string" && prefix.startsWith(query));
	return { mode: null, pending };
}

export function getPreviewFocusText(item) {
	if (!item) return "";
	if (item.kind === "content") return String(item.snippet ?? "");
	if (item.kind === "heading") return String(item.heading ?? "");
	if (item.kind === "symbol") return String(item.text ?? "");
	return "";
}

/**
 * The input placeholder for the active mode. The tiny mode badge is easy to miss,
 * so the large field itself should say what Enter will do — in Capture mode the
 * default "Search notes…" copy is an outright lie. Falls back to the files prompt
 * for any unknown mode so a new mode can never leave the field blank.
 */
const MODE_PLACEHOLDERS = {
	files: "Search notes, tags, or properties…",
	content: "Search inside your notes…",
	headings: "Jump to a heading…",
	symbols: "Jump to a symbol in this note…",
	commands: "Search commands…",
	links: "Find linked notes…",
	editors: "Switch to an open tab…",
	folders: "Jump to a folder…",
	capture: "Capture to your daily note…",
	snippets: "Insert a snippet…",
};

export function getModePlaceholder(mode) {
	return MODE_PLACEHOLDERS[mode] ?? MODE_PLACEHOLDERS.files;
}

/**
 * Build the keyboard-shortcut cheatsheet shown by the in-modal help overlay
 * (Mod+/). Pure so the content is unit-tested without spinning up the modal:
 * the whole point of the overlay is that the mode-trigger vocabulary stays
 * reachable forever, not only during the first five opens, so it derives every
 * trigger from the live, user-configurable prefixes rather than hard-coded glyphs.
 */
export function getHelpSections({ isPro = false, prefixes = {}, modifierLabel = "Ctrl", escapeChar = "\\" } = {}) {
	const mod = modifierLabel;
	const trigger = (mode, label) => ({ keys: [prefixes[mode] ?? ""], label, proOnly: PRO_ONLY_MODES.has(mode) });
	const sections = [
		{
			title: "Navigate",
			entries: [
				{ keys: ["↑", "↓"], label: "Move selection" },
				{ keys: [mod, "N"], label: "Down / up (also Ctrl+P)" },
				{ keys: ["Alt", "↓"], label: "Recent searches" },
				{ keys: ["PgUp", "PgDn"], label: "Jump a page" },
				{ keys: ["Home", "End"], label: "First / last result" },
				{ keys: ["Tab"], label: "Next mode" },
				{ keys: ["Shift", "Tab"], label: "Previous mode" },
			],
		},
		{
			title: "Act on a result",
			entries: [
				{ keys: ["↵"], label: "Open" },
				{ keys: [mod, "↵"], label: "Open in new tab" },
				{ keys: [mod, "Alt", "↵"], label: "Open in split" },
				{ keys: ["Alt", "↵"], label: "Result actions menu" },
				{ keys: ["Shift", "↵"], label: "Create a new note" },
				{ keys: [mod, "K"], label: "Action palette" },
				{ keys: [mod, "S"], label: "Save this search as a workflow" },
			],
		},
		{
			title: "Modes — type a trigger to switch",
			entries: [
				trigger("content", "Search inside notes"),
				trigger("headings", "Jump to a heading"),
				trigger("commands", "Run a command"),
				trigger("symbols", "Outline of the active note"),
				trigger("links", "Backlinks and outlinks"),
				trigger("editors", "Open tabs and panes"),
				trigger("folders", "Find and browse a folder"),
				trigger("capture", "Quick-capture a thought"),
				trigger("snippets", "Insert a snippet"),
				{ keys: ["#tag"], label: "Filter by tag" },
				{ keys: ["2+2"], label: "Inline calculator" },
				{ keys: [escapeChar], label: "Search a trigger literally" },
			],
		},
	];
	if (isPro) {
		sections.push({
			title: "Pro",
			entries: [
				{ keys: [mod, "D"], label: "Star / unstar the selected note" },
				{ keys: [mod, "Space"], label: "Multi-select for batch actions" },
			],
		});
	}
	return sections;
}

/**
 * Return only the shortcuts that are actually useful for the currently
 * highlighted row, so the footer never advertises dead or misleading keys.
 */
export function getShortcutHints({ itemKind = null, defaultNewTab = false, isPro = false, modifierLabel = "Ctrl" }) {
	const hints = [
		{ keys: ["↑", "↓"], label: "navigate" },
		{ keys: ["Tab"], label: "next mode" },
		{ keys: ["Shift", "Tab"], label: "previous mode" },
	];

	const openTarget = defaultNewTab ? "same tab" : "new tab";
	const openLikeKinds = new Set(["file", "content", "heading", "symbol", "editor"]);
	const actionPaletteKinds = new Set([
		"file",
		"content",
		"heading",
		"symbol",
		"editor",
		"folder",
		"command",
		"collection",
		"profile",
		"workflow",
		"calc",
		"datejump",
		"capture",
		"snippet",
		"create",
	]);

	if (openLikeKinds.has(itemKind)) {
		hints.splice(1, 0,
			{ keys: ["↵"], label: "open" },
			{ keys: [modifierLabel, "↵"], label: openTarget },
			{ keys: ["Shift", "↵"], label: "new note" }
		);
	} else if (itemKind === "folder") {
		hints.splice(1, 0, { keys: ["↵"], label: "browse" });
	} else if (itemKind === "history") {
		hints.splice(1, 0, { keys: ["↵"], label: "search again" });
	} else if (itemKind === "collection" || itemKind === "profile" || itemKind === "workflow") {
		hints.splice(1, 0, { keys: ["↵"], label: "apply" });
	} else if (itemKind === "action" || itemKind === "command") {
		hints.splice(1, 0, { keys: ["↵"], label: "run" });
	} else if (itemKind === "calc") {
		hints.splice(1, 0,
			{ keys: ["↵"], label: "copy" },
			{ keys: ["Shift", "↵"], label: "insert" }
		);
	} else if (itemKind === "datejump") {
		hints.splice(1, 0, { keys: ["↵"], label: "open daily note" });
	} else if (itemKind === "capture") {
		hints.splice(1, 0, { keys: ["↵"], label: "capture" });
	} else if (itemKind === "snippet") {
		hints.splice(1, 0, { keys: ["↵"], label: "insert" });
	} else if (itemKind === "create") {
		hints.splice(1, 0, { keys: ["↵"], label: "create note" });
	} else if (itemKind === "quickaction") {
		// Home quick actions have no action palette (see actionPaletteKinds), so just
		// the confirm chip. The verb differs per action (capture vs open daily note),
		// so "run" is the honest generic label for the shared row kind.
		hints.splice(1, 0, { keys: ["↵"], label: "run" });
	} else {
		hints.splice(1, 0,
			{ keys: ["↵"], label: "open" },
			{ keys: [modifierLabel, "↵"], label: openTarget },
			{ keys: ["Shift", "↵"], label: "new note" }
		);
	}

	if (itemKind && actionPaletteKinds.has(itemKind) && itemKind !== "history" && itemKind !== "action" && itemKind !== "create") {
		hints.splice(hints.length - 2, 0, { keys: [modifierLabel, "K"], label: "actions" });
	}

	if (isPro && itemKind === "file") {
		hints.splice(hints.length - 2, 0,
			{ keys: [modifierLabel, "D"], label: "star" },
			{ keys: [modifierLabel, "Space"], label: "select" }
		);
	}

	return hints;
}
