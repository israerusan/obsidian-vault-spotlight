import assert from "assert";
import {
	describeCaptureTarget,
	cycleMode,
	getDrillPrefixMatch,
	getModifierLabel,
	getPreviewFocusText,
	getShortcutHints,
} from "../src/core/modalCopy.mjs";

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

// --- Mode cycling -----------------------------------------------------------
assert.equal(cycleMode("files", { isPro: false, direction: 1 }), "symbols", "free users skip locked modes on Tab");
assert.equal(cycleMode("symbols", { isPro: false, direction: -1 }), "files", "free users can reverse-cycle with Shift+Tab");
assert.equal(cycleMode("capture", { isPro: false, direction: 1 }), "files", "free cycle wraps cleanly");
assert.equal(cycleMode("files", { isPro: true, direction: -1 }), "snippets", "pro reverse cycle includes all modes");

// --- Drill-in prefix matching ----------------------------------------------
const customPrefixes = { symbols: "$$", links: "~~" };
assert.deepEqual(
	getDrillPrefixMatch("$", customPrefixes),
	{ mode: null, pending: true },
	"partial multi-character drill prefix waits for another key"
);
assert.deepEqual(
	getDrillPrefixMatch("$$", customPrefixes),
	{ mode: "symbols", pending: false },
	"full custom symbols prefix triggers drill-in"
);
assert.deepEqual(
	getDrillPrefixMatch("~~", customPrefixes),
	{ mode: "links", pending: false },
	"full custom links prefix triggers drill-in"
);

// --- Preview focus ----------------------------------------------------------
assert.equal(getPreviewFocusText({ kind: "content", snippet: "matched passage here" }), "matched passage here");
assert.equal(getPreviewFocusText({ kind: "heading", heading: "Roadmap" }), "Roadmap");
assert.equal(getPreviewFocusText({ kind: "symbol", text: "Implementation" }), "Implementation");
assert.equal(getPreviewFocusText({ kind: "file" }), "", "plain file rows do not force preview focus text");

// --- Shortcut hints ---------------------------------------------------------
const calcHints = getShortcutHints({ itemKind: "calc", defaultNewTab: false, isPro: true });
assert.deepEqual(
	calcHints.map((hint) => `${hint.keys.join("+")}:${hint.label}`),
	[
		"↑+↓:navigate",
		"↵:copy",
		"Shift+↵:insert",
		"Ctrl+K:actions",
		"Tab:next mode",
		"Shift+Tab:previous mode",
	],
	"calc hints match actual copy/insert behavior"
);

const fileHints = getShortcutHints({ itemKind: "file", defaultNewTab: true, isPro: true, modifierLabel: "Cmd" });
assert.deepEqual(
	fileHints.map((hint) => `${hint.keys.join("+")}:${hint.label}`),
	[
		"↑+↓:navigate",
		"↵:open",
		"Cmd+↵:same tab",
		"Shift+↵:new note",
		"Cmd+K:actions",
		"Cmd+D:star",
		"Cmd+Space:select",
		"Tab:next mode",
		"Shift+Tab:previous mode",
	],
	"file hints include open variants, Pro file actions, and platform modifier labels"
);

const historyHints = getShortcutHints({ itemKind: "history", defaultNewTab: false, isPro: true });
assert.deepEqual(
	historyHints.map((hint) => `${hint.keys.join("+")}:${hint.label}`),
	["↑+↓:navigate", "↵:search again", "Tab:next mode", "Shift+Tab:previous mode"],
	"history hints avoid dead shortcuts like new note or actions"
);

assert.equal(getModifierLabel("MacIntel"), "Cmd", "mac platforms render Cmd");
assert.equal(getModifierLabel("Win32"), "Ctrl", "non-mac platforms render Ctrl");

console.log("modal copy tests passed");
