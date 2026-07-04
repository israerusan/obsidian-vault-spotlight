import assert from "assert";
import { describeCaptureTarget, getShortcutHints } from "../src/core/modalCopy.mjs";

// --- Capture descriptions ---------------------------------------------------
assert.equal(
	describeCaptureTarget({ hasText: false, targetLabel: "2026-07-03" }),
	"Type a note, then press Enter to capture",
	"empty capture prompt is instructional"
);
assert.equal(
	describeCaptureTarget({ hasText: true, targetLabel: "2026-07-03", mode: "append" }),
	"Append to 2026-07-03",
	"append mode is described plainly"
);
assert.equal(
	describeCaptureTarget({ hasText: true, targetLabel: "Inbox.md", mode: "prepend" }),
	"Prepend to Inbox.md",
	"prepend mode is described plainly"
);
assert.equal(
	describeCaptureTarget({ hasText: true, targetLabel: "2026-07-03", mode: "prepend", heading: "## Log" }),
	"Capture under Log in 2026-07-03",
	"heading placement wins over prepend wording"
);

// --- Shortcut hints ---------------------------------------------------------
const calcHints = getShortcutHints({ itemKind: "calc", defaultNewTab: false, isPro: true });
assert.deepEqual(
	calcHints.map((hint) => `${hint.keys.join("+")}:${hint.label}`),
	["↑+↓:navigate", "↵:copy", "Shift+↵:insert", "Ctrl+K:actions", "Tab:mode"],
	"calc hints match actual copy/insert behavior"
);

const fileHints = getShortcutHints({ itemKind: "file", defaultNewTab: true, isPro: true });
assert.deepEqual(
	fileHints.map((hint) => `${hint.keys.join("+")}:${hint.label}`),
	[
		"↑+↓:navigate",
		"↵:open",
		"Ctrl+↵:same tab",
		"Shift+↵:new note",
		"Ctrl+K:actions",
		"Ctrl+D:star",
		"Ctrl+Space:select",
		"Tab:mode",
	],
	"file hints include open variants and Pro file actions"
);

const historyHints = getShortcutHints({ itemKind: "history", defaultNewTab: false, isPro: true });
assert.deepEqual(
	historyHints.map((hint) => `${hint.keys.join("+")}:${hint.label}`),
	["↑+↓:navigate", "↵:search again", "Tab:mode"],
	"history hints avoid dead shortcuts like new note or actions"
);

console.log("modal copy tests passed");
