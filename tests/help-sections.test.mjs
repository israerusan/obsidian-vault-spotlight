// Pure-logic tests for the in-modal help overlay content and the mode-aware input
// placeholder. The overlay exists so the mode-trigger vocabulary stays reachable
// forever (not only during the first five opens), so these lock two invariants:
// the cheatsheet derives its triggers from the LIVE user-configurable prefixes,
// and the placeholder never lies about the active mode.
import assert from "node:assert";
import { getHelpSections, getModePlaceholder } from "../src/core/modalCopy.mjs";
import { DEFAULT_MODE_PREFIXES } from "../src/core/modeTriggers.mjs";
import { PRO_ONLY_MODES } from "../src/core/featureGates.mjs";

// --- getModePlaceholder ------------------------------------------------------
assert.match(getModePlaceholder("files"), /Search notes/, "files placeholder");
assert.match(getModePlaceholder("capture"), /[Cc]apture/, "capture placeholder is about capturing, not searching");
assert.match(getModePlaceholder("commands"), /command/i, "commands placeholder");
// Unknown/new mode must never blank the field — fall back to the files prompt.
assert.equal(getModePlaceholder("does-not-exist"), getModePlaceholder("files"), "unknown mode falls back to files prompt");
// Every real mode has its own, non-empty prompt.
for (const mode of ["files", "content", "headings", "symbols", "commands", "links", "editors", "folders", "capture", "snippets"]) {
	assert.ok(getModePlaceholder(mode).length > 0, `mode ${mode} has a placeholder`);
}

// --- getHelpSections ---------------------------------------------------------
{
	const sections = getHelpSections({ isPro: false, prefixes: DEFAULT_MODE_PREFIXES, modifierLabel: "Ctrl", escapeChar: "\\" });
	assert.ok(sections.length >= 3, "at least Navigate / Act / Modes sections");
	const titles = sections.map((s) => s.title);
	assert.ok(titles.some((t) => /mode/i.test(t)), "a Modes section exists");
	// Free tier omits the Pro section.
	assert.ok(!titles.some((t) => /^Pro$/i.test(t)), "free tier hides the Pro section");

	// Triggers come from the live prefixes, not hard-coded glyphs: swap a prefix and
	// the cheatsheet must follow it (the whole reason it's data-driven).
	const custom = getHelpSections({ prefixes: { ...DEFAULT_MODE_PREFIXES, content: "»" }, modifierLabel: "Cmd" });
	const modeSection = custom.find((s) => /mode/i.test(s.title));
	const contentEntry = modeSection.entries.find((e) => /inside notes/i.test(e.label));
	assert.equal(contentEntry.keys[0], "»", "content trigger reflects the user's configured prefix");
	// Pro-only modes are flagged so the overlay can badge them.
	assert.equal(contentEntry.proOnly, PRO_ONLY_MODES.has("content"), "content entry carries its Pro flag");
	const foldersEntry = modeSection.entries.find((e) => /folder/i.test(e.label));
	assert.equal(foldersEntry.proOnly, false, "folders is a free mode");
}

{
	const pro = getHelpSections({ isPro: true, prefixes: DEFAULT_MODE_PREFIXES, modifierLabel: "Cmd" });
	assert.ok(pro.some((s) => /^Pro$/i.test(s.title)), "Pro tier shows the Pro section");
}

console.log("help-sections tests passed");
