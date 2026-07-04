/**
 * Small, pure helpers for user-facing copy in the Spotlight modal.
 * Keeping them here lets us test UX wording/shortcut truthfulness without
 * spinning up Obsidian UI objects.
 */

function normalizeHeading(heading) {
	return String(heading ?? "")
		.replace(/^#+\s*/, "")
		.trim();
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

/**
 * Return only the shortcuts that are actually useful for the currently
 * highlighted row, so the footer never advertises dead or misleading keys.
 */
export function getShortcutHints({ itemKind = null, defaultNewTab = false, isPro = false }) {
	const hints = [
		{ keys: ["↑", "↓"], label: "navigate" },
		{ keys: ["Tab"], label: "mode" },
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
			{ keys: ["Ctrl", "↵"], label: openTarget },
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
			{ keys: ["Ctrl", "↵"], label: openTarget },
			{ keys: ["Shift", "↵"], label: "new note" }
		);
	}

	if (itemKind && actionPaletteKinds.has(itemKind) && itemKind !== "history" && itemKind !== "action" && itemKind !== "create") {
		hints.splice(hints.length - 1, 0, { keys: ["Ctrl", "K"], label: "actions" });
	}

	if (isPro && itemKind === "file") {
		hints.splice(hints.length - 1, 0,
			{ keys: ["Ctrl", "D"], label: "star" },
			{ keys: ["Ctrl", "Space"], label: "select" }
		);
	}

	return hints;
}
