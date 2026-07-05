// Bundle entry: exposes the REAL production searchers (compiled from src/search
// with `obsidian` aliased to obsidian-mock) plus the fixture-vault loader, so the
// Node harness drives the exact code that ships.
export { loadVaultApp, parseMarkdown } from "./vault.mjs";
export { FileSearcher } from "../../src/search/FileSearcher";
export { ContentSearcher } from "../../src/search/ContentSearcher";
export { HeadingSearcher } from "../../src/search/HeadingSearcher";
export { SymbolSearcher } from "../../src/search/SymbolSearcher";
export { CanvasSearcher } from "../../src/search/CanvasSearcher";
export { BaseSearcher } from "../../src/search/BaseSearcher";
export { RipgrepSearcher } from "../../src/search/RipgrepSearcher";
export { TFile } from "obsidian";

// Modal-driving harness surface.
export { SpotlightModal } from "../../src/spotlight/SpotlightModal";
export { makeStubPlugin } from "./stub-plugin.mjs";
export { Modal, FakeEvent } from "./obsidian-mock.mjs";
import { harnessWindow } from "./obsidian-mock.mjs";

/** Point the bundled code's global `window` (timers, rAF) at the fake window. */
export function installWindow() {
	globalThis.window = harnessWindow;
}
export function uninstallWindow() {
	delete globalThis.window;
}
