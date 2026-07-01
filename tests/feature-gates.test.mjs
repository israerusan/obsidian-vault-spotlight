import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const spotlight = fs.readFileSync(path.join(repoRoot, "src", "spotlight", "SpotlightModal.ts"), "utf8");
const settings = fs.readFileSync(path.join(repoRoot, "src", "settings.ts"), "utf8");
const readme = fs.readFileSync(path.join(repoRoot, "README.md"), "utf8");

assert.ok(spotlight.includes('kind: "action"'), "spotlight should expose a keyboard action-palette result kind");
assert.ok(spotlight.includes("openActionPalette"), "spotlight should open an action palette from the selected result");
assert.ok(spotlight.includes("Ctrl") && spotlight.includes("K"), "spotlight footer/shortcuts should advertise Ctrl+K actions");
assert.ok(spotlight.includes("requiresPro") && spotlight.includes("settings.isPro"), "actions should carry and enforce Pro gating");

assert.ok(settings.includes("pinnedCustomSearchIds"), "settings should persist pinned smart collections");
assert.ok(settings.includes("searchProfiles"), "settings should persist Pro search profiles");
assert.ok(spotlight.includes('kind: "profile"'), "empty browse should show search profiles as selectable results");
assert.ok(spotlight.includes("activateProfile"), "spotlight should activate a selected search profile");
assert.ok(spotlight.includes('kind: "collection"'), "empty browse should show smart collections as selectable results");
assert.ok(spotlight.includes("togglePinnedCollection"), "spotlight should let users pin/unpin smart collections");

assert.ok(spotlight.includes("exportResultsToNote"), "spotlight should export search results to a Markdown note");
assert.ok(spotlight.includes("copyResultsAsMarkdown"), "spotlight should copy selected/search results as Markdown links");
assert.ok(spotlight.includes("batchAddTag"), "spotlight should support a Pro batch add-tag action");
assert.ok(spotlight.includes("batchRemoveTag"), "spotlight should support a Pro batch remove-tag action");
assert.ok(spotlight.includes("batchSetProperty"), "spotlight should support a Pro batch set-property action");
assert.ok(spotlight.includes("batchMoveFiles"), "spotlight should support a Pro batch move action");
assert.ok(spotlight.includes("createMocFromResults"), "spotlight should support MOC generation from results");
assert.ok(spotlight.includes("appendLinksToActiveNote"), "spotlight should append result links to the active note");
assert.ok(settings.includes("searchAliases"), "settings should persist Pro query aliases");
assert.ok(readme.includes("Keyboard action palette"), "README should document the action palette");
assert.ok(readme.includes("Smart collections"), "README should document smart collections");
assert.ok(readme.includes("Export results"), "README should document result export");

console.log("feature gate tests passed");
