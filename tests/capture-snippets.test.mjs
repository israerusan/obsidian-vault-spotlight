import assert from "assert";
import { insertCapture } from "../src/core/capture.mjs";
import { normalizeSnippets, createSnippet, expandSnippet } from "../src/core/snippets.mjs";

// --- Capture: append --------------------------------------------------------
assert.equal(insertCapture("", "first"), "first\n", "append to empty note");
assert.equal(insertCapture("a\n", "b"), "a\nb\n", "append keeps single separation");
assert.equal(insertCapture("a", "b"), "a\nb\n", "append adds missing newline");
assert.equal(insertCapture("a\n\n\n", "b"), "a\nb\n", "append collapses trailing blanks");

// --- Capture: prepend (frontmatter-aware) -----------------------------------
assert.equal(insertCapture("body", "top", { mode: "prepend" }), "top\n\nbody", "prepend to top");
const fm = "---\ntag: x\n---\nbody\n";
const prepended = insertCapture(fm, "note", { mode: "prepend" });
assert.ok(prepended.startsWith("---\ntag: x\n---\n"), "prepend preserves frontmatter block");
assert.ok(prepended.includes("note"), "prepend inserts text after frontmatter");
assert.ok(prepended.indexOf("note") < prepended.indexOf("body"), "prepended text precedes body");

// --- Capture: under heading -------------------------------------------------
const doc = "# Journal\n\n## Log\n- existing\n\n## Tasks\n- todo\n";
const underLog = insertCapture(doc, "- new entry", { heading: "Log" });
assert.ok(/- existing\n- new entry/.test(underLog), "insert at end of the Log section");
assert.ok(underLog.indexOf("- new entry") < underLog.indexOf("## Tasks"), "stays within its section");

const missing = insertCapture("# Journal\n", "- captured", { heading: "Inbox" });
assert.ok(missing.includes("## Inbox"), "missing heading is created");
assert.ok(missing.includes("- captured"), "capture preserved when heading missing");

// heading match ignores leading hashes and case
const hashHeading = insertCapture("## log\n- a\n", "- b", { heading: "## Log" });
assert.ok(/- a\n- b/.test(hashHeading), "heading match ignores case and hashes");

// A "# heading" inside a fenced code block must not fool section detection.
const fenced = "## Log\n- a\n\n```\n# not a heading\n```\n\n## Next\n- b\n";
const fencedResult = insertCapture(fenced, "- c", { heading: "Log" });
assert.ok(fencedResult.indexOf("- c") > fencedResult.indexOf("# not a heading"), "capture goes past the code fence");
assert.ok(fencedResult.indexOf("- c") < fencedResult.indexOf("## Next"), "capture stays before the real next heading");
assert.ok(fencedResult.includes("```\n# not a heading\n```"), "code fence content is untouched");

// --- Snippets: normalize ----------------------------------------------------
assert.deepEqual(normalizeSnippets(null), [], "non-array normalizes to empty");
const normalized = normalizeSnippets([
	{ id: "a", name: "Sig", body: "Best," },
	{ name: "", body: "x" }, // dropped: no name
	{ name: "Draft", body: "" }, // kept: empty body is a WIP snippet, not data loss
]);
assert.equal(normalized.length, 2, "only nameless snippets are dropped");
assert.equal(normalized[0].name, "Sig", "valid snippet kept");
assert.equal(normalized[1].name, "Draft", "empty-body snippet survives reload");

const created = createSnippet("Greeting", "Hi {{cursor}}");
assert.ok(created.id.length > 0 && created.name === "Greeting", "createSnippet builds a record");

// --- Snippets: placeholder expansion ---------------------------------------
const ctx = { date: "2026-07-03", time: "15:30", clipboard: "PASTED", selection: "SEL" };
assert.equal(expandSnippet("On {{date}} at {{time}}", ctx).text, "On 2026-07-03 at 15:30", "date/time expand");
assert.equal(expandSnippet("Paste: {{clipboard}}", ctx).text, "Paste: PASTED", "clipboard expands");
assert.equal(expandSnippet("{{selection}} wrapped", ctx).text, "SEL wrapped", "selection expands");
assert.equal(expandSnippet("no placeholders").text, "no placeholders", "plain body unchanged");
assert.equal(expandSnippet("{{unknown}}").text, "{{unknown}}", "unknown placeholder left intact");
assert.equal(expandSnippet("empty {{clipboard}}").text, "empty ", "missing ctx value → empty string");

// --- Snippets: cursor offset ------------------------------------------------
const cur = expandSnippet("Dear {{cursor}},\nBody");
assert.equal(cur.text, "Dear ,\nBody", "cursor token removed");
assert.equal(cur.cursorOffset, 5, "cursor offset at token position");
assert.equal(expandSnippet("no cursor").cursorOffset, 9, "offset defaults to end when no cursor token");
const both = expandSnippet("{{date}}-{{cursor}}", { date: "2026" });
assert.equal(both.text, "2026-", "date resolves before cursor offset is computed");
assert.equal(both.cursorOffset, 5, "offset accounts for expanded placeholders");
// A literal {{cursor}} arriving via clipboard/selection must not steal the caret.
const clipCursor = expandSnippet("Paste {{clipboard}} end", { clipboard: "x {{cursor}} y" });
assert.equal(clipCursor.text, "Paste x {{cursor}} y end", "clipboard {{cursor}} is kept literal");
assert.equal(clipCursor.cursorOffset, clipCursor.text.length, "no real cursor token → caret at end");
// Only the first {{cursor}} anchors; extras in the body are dropped.
const multi = expandSnippet("a{{cursor}}b{{cursor}}c");
assert.equal(multi.text, "abc", "extra cursor tokens removed");
assert.equal(multi.cursorOffset, 1, "first cursor token anchors the caret");

console.log("capture + snippets tests passed");
