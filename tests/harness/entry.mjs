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
