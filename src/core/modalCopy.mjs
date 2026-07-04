/**
 * Small, pure helpers for user-facing copy and keyboard behavior in the
 * Spotlight modal. Keeping them here lets us test UX truthfulness without
 * spinning up Obsidian UI objects.
 */

const PRO_ONLY_MODE_SET = new Set(["content", "headings", "links", "snippets"]);
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
	return MODE_ORDER.filter((mode) => isPro || !PRO_ONLY_MODE_SET.has(mode));
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
