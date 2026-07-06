import { App, TFile, TFolder, moment } from "obsidian";
import type VaultSpotlightPlugin from "../main";
import { FileSearcher } from "../search/FileSearcher";
import { HeadingSearcher } from "../search/HeadingSearcher";
import { CommandSearcher } from "../search/CommandSearcher";
import { SymbolSearcher } from "../search/SymbolSearcher";
import { EditorSearcher } from "../search/EditorSearcher";
import { parseHeadingQuery } from "../core/modeTriggers.mjs";
import { expandSearchAlias } from "../core/searchAliases.mjs";
import { fuzzyMatch, tokenizeQuery } from "../search/fuzzy";
import { getVaultFileKind } from "../search/vaultFiles";
import { activeProfile, type CoreSearchProfile } from "../core/searchProfiles.mjs";
import { resolveSavedWorkflows, type SavedWorkflow } from "../core/savedWorkflows.mjs";
import { findBacklinks, findOutlinks } from "../core/linkGraph.mjs";
import { evaluateExpression, parseCurrencyRates } from "../core/calculator.mjs";
import { parseNaturalDate } from "../core/naturalDates.mjs";
import { describeCaptureTarget } from "../core/modalCopy.mjs";
import { isProOnlyMode } from "../core/featureGates.mjs";
import {
	itemFile,
	type ResultItem,
	type SpotlightAction,
	type SpotlightMode,
} from "./resultTypes";
import type { CaptureController } from "./CaptureController";
import {
	buildCommandItems,
	buildContentItems,
	buildHeadingItems,
	buildSymbolItems,
	buildEditorItems,
	buildFileItems,
	buildSavedObjectItems,
} from "./resultBuilders";

/**
 * Obsidian re-exports `moment` via `import * as Moment` — under tsconfigs with
 * `esModuleInterop` on (the Obsidian sample default) that namespace import loses
 * its call signature, so `moment(...)` degrades to `any` and trips the review's
 * no-unsafe-* rules. Pin a minimal callable view (we only ever format) so the
 * call sites stay typed regardless of interop settings. Behavior is unchanged.
 */
const formatMoment = moment as unknown as (input?: number) => { format(fmt?: string): string };

// Keystroke → search debounce.
const SEARCH_DEBOUNCE_MS = 60;
// Per-mode result caps. The modal only renders ~50-60 rows, so these bound the
// work; named here rather than repeated as magic numbers across the mode branches.
const RESULT_LIMIT = 60; // commands, headings, editors, folders, links, snippets
const FILE_QUERY_LIMIT = 50; // files with a text query
const FILE_BROWSE_LIMIT = 40; // files, empty query (browse recents/all)
const SYMBOL_LIMIT = 100; // symbol outline of the active note
const COMMAND_BROWSE_LIMIT = 1000; // empty command query: rank the whole palette before slicing

/**
 * What query execution needs back from the view and the mode controller. Mutable
 * mode/query/actionContext state stays OWNED by the modal + ModeController and is
 * reached through accessors, so the searcher can never hold a stale copy. Same
 * host-seam idea as WorkflowController / CaptureController / batchOps.
 */
export interface SearchHost {
	app: App;
	plugin: VaultSpotlightPlugin;
	capture: CaptureController;
	inputValue(): string;
	resolveQuery(raw: string): { mode: SpotlightMode; body: string };
	actionContext(): ResultItem | null;
	availableActions(context: ResultItem): SpotlightAction[];
	drillFile(): TFile | null;
	activeWorkflowId(): string;
	setBadge(text: string, cls: "is-content" | "is-pro" | null): void;
	renderResults(): void;
	renderEmptyState(icon: string, title: string, desc: string): void;
	renderLoading(): void;
	markSearching(): void;
	hasVisibleRows(): boolean;
	updateStatus(count: number): void;
	updatePreview(): void;
}

/**
 * Query execution + the result set, extracted from SpotlightModal. Owns `items`,
 * the selection index, the multi-select check set, the debounce/loading timers,
 * and the five per-mode searchers. The dispatcher (runSearch) reads the live
 * mode/query/actionContext through the host so the modal keeps ownership of that
 * state. The view renders whatever lands in `items`.
 */
export class SearchController {
	items: ResultItem[] = [];
	selectedIndex = 0;
	checkedPaths = new Set<string>();
	// Set by the background metadata listener so a passive re-index preserves the
	// user's place instead of snapping the selection back to the top.
	preserveSelection = false;

	private searchTimer: number | null = null;
	private loadingTimer: number | null = null;
	private searchGeneration = 0;
	private isLoading = false;

	private fileSearcher: FileSearcher;
	private headingSearcher: HeadingSearcher;
	readonly commandSearcher: CommandSearcher;
	private symbolSearcher: SymbolSearcher;
	readonly editorSearcher: EditorSearcher;

	constructor(private host: SearchHost) {
		const app = host.app;
		this.fileSearcher = new FileSearcher(app);
		this.headingSearcher = new HeadingSearcher(app);
		this.commandSearcher = new CommandSearcher(app);
		this.symbolSearcher = new SymbolSearcher(app);
		this.editorSearcher = new EditorSearcher(app);
	}

	private get plugin(): VaultSpotlightPlugin {
		return this.host.plugin;
	}

	private get app(): App {
		return this.host.app;
	}

	/** Cancel the debounce + loading timers and invalidate any in-flight search.
	 * Called from the view's onClose so a timer can't fire against a detached modal. */
	cancelTimers(): void {
		this.searchGeneration++;
		if (this.searchTimer !== null) {
			window.clearTimeout(this.searchTimer);
			this.searchTimer = null;
		}
		if (this.loadingTimer !== null) {
			window.clearTimeout(this.loadingTimer);
			this.loadingTimer = null;
		}
	}

	currentProfile(): CoreSearchProfile | null {
		if (!this.plugin.settings.isPro) return null;
		return activeProfile(this.plugin.settings.searchProfiles, this.plugin.settings.activeProfileId);
	}

	currentWorkflow(): SavedWorkflow | null {
		// Resolve from the unified list (savedWorkflows unioned with any legacy
		// workflowPresets) so an applied workflow's inlined scope/ranking is honored.
		const workflows = resolveSavedWorkflows(this.plugin.settings.savedWorkflows, this.plugin.settings.workflowPresets);
		return workflows.find((workflow) => workflow.id === this.host.activeWorkflowId()) ?? null;
	}

	hasMetadataFilters(): boolean {
		const parsed = tokenizeQuery(this.host.inputValue() ?? "");
		return parsed.tags.length > 0 || parsed.properties.length > 0;
	}

	private expandAliases(raw: string): string {
		return expandSearchAlias(raw, {
			isPro: this.plugin.settings.isPro,
			aliases: this.plugin.settings.searchAliases,
		});
	}

	scheduleSearch(): void {
		if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
		this.searchTimer = window.setTimeout(() => void this.runSearch(), SEARCH_DEBOUNCE_MS);
	}

	async runSearch(): Promise<void> {
		const generation = ++this.searchGeneration;
		// If this run should keep the user's place (a background re-index), record
		// the selected row's identity so it can be re-found after the rebuild.
		const preservedKey = this.preserveSelection ? this.itemKey(this.items[this.selectedIndex]) : null;
		this.preserveSelection = false;
		const raw = this.expandAliases(this.host.inputValue());
		const trimmed = raw.trim();
		const { mode, body } = this.host.resolveQuery(raw);
		const isEmptyQuery = body.length === 0;
		const isPro = this.plugin.settings.isPro;
		const profile = this.currentProfile();
		const workflow = this.currentWorkflow();
		// A workflow's inlined scope wins over a legacy active profile, which wins over
		// the global settings — one fallback chain for every scope facet.
		const scope = workflow?.scope;
		const excludeFolders = scope?.excludeFolders ?? profile?.excludeFolders ?? this.plugin.settings.excludeFolders;
		const includeCanvas = scope?.includeCanvas ?? profile?.includeCanvas ?? this.plugin.settings.includeCanvas;
		const includePdf = scope?.includePdf ?? profile?.includePdf ?? this.plugin.settings.includePdf;
		const includeBases = scope?.includeBases ?? profile?.includeBases ?? this.plugin.settings.includeBases;

		this.isLoading = true;

		// results (the common case) render directly, without a flash.
		if (this.loadingTimer !== null) window.clearTimeout(this.loadingTimer);
		this.loadingTimer = window.setTimeout(() => {
			this.loadingTimer = null;
			if (!this.isLoading) return;
			// On a re-query, keep the previous rows on screen and just dim them —
			// tearing the list down to skeletons on every keystroke loses the
			// user's context and place. Skeletons are only for the first render.
			if (!this.host.hasVisibleRows()) {
				this.host.renderLoading();
			} else {
				this.host.markSearching();
			}
		}, 100);

		const actionContext = this.host.actionContext();
		if (actionContext) {
			// This branch sits outside the main try/catch below, so guard it on its
			// own: a throw while building the action list must still tear the loading
			// state down (in a finally) or the skeleton spinner would be stranded.
			try {
				const actions = this.host.availableActions(actionContext);
				const query = trimmed.toLowerCase();
				this.host.setBadge("Actions", "is-content");
				this.items = actions
					.filter((action) => !query || `${action.name} ${action.description}`.toLowerCase().includes(query))
					.map((action) => ({ kind: "action" as const, action }));
				this.selectedIndex = 0;
				this.host.renderResults();
				this.host.updateStatus(this.items.length);
			} catch (err) {
				console.error("[VaultSpotlight] action palette failed", err);
				this.items = [];
				this.host.renderEmptyState("alert-triangle", "Couldn't build actions", "Something went wrong. Press Escape to go back.");
				this.host.updateStatus(0);
			} finally {
				this.isLoading = false;
				if (this.loadingTimer !== null) {
					window.clearTimeout(this.loadingTimer);
					this.loadingTimer = null;
				}
			}
			return;
		}

		try {
			if (isProOnlyMode(mode) && !isPro) {
				this.host.setBadge("Pro", "is-pro");
				this.items = [];
				this.isLoading = false;
				this.host.renderEmptyState(
					"lock",
					mode === "content" ? "Content search is a Pro feature" : mode === "headings" ? "Heading jump is a Pro feature" : mode === "snippets" ? "Snippets are a Pro feature" : "Links mode is a Pro feature",
					mode === "content"
						? "Search inside note bodies with queries like > meeting notes."
						: mode === "headings"
							? "Jump straight to any heading across your vault."
							: mode === "snippets"
								? "Insert reusable text snippets with date, time, clipboard, and cursor placeholders."
								: "Browse backlinks and outlinks for the active note or a matching note."
				);
				this.host.updateStatus(0);
				return;
			}

			if (mode === "commands") {
				const cmdQuery = body;
				this.host.setBadge("Commands", "is-content");
				// Empty query: resurface recently-run commands first, then the rest.
				const commandResults = this.commandSearcher.search(cmdQuery, cmdQuery ? RESULT_LIMIT : COMMAND_BROWSE_LIMIT, this.plugin.settings.ranking.ignoreDiacritics);
				if (generation !== this.searchGeneration) return;
				this.items = buildCommandItems(commandResults, this.plugin.settings.recentCommandIds, cmdQuery.length === 0, RESULT_LIMIT);
			} else if (mode === "content") {
				const text = body;
				this.host.setBadge("Content", "is-content");
				// On an empty content query, surface recent searches to re-run
				// instead of an empty pane (mirrors the Recent files browse view).
				if (text.length === 0) {
					const history = this.plugin.settings.recentSearches ?? [];
					this.items = history.map((q) => ({ kind: "history" as const, query: q }));
					if (generation !== this.searchGeneration) return;
					this.isLoading = false;
					this.selectedIndex = 0;
					if (this.items.length === 0) {
						this.host.renderEmptyState(
							"text",
							"Search file contents",
							"Type to search inside your notes — every word must appear on the same line. Recent searches appear here."
						);
						this.host.updateStatus(0);
					} else {
						this.host.renderResults();
						this.host.updateStatus(this.items.length);
						this.host.updatePreview();
					}
					return;
				}
				const contentResults = await this.plugin.contentSearcher.search(text, {
					useRipgrep: isPro,
					includeCanvas: isPro && includeCanvas,
					includeBases: isPro && includeBases,
					excludeFolders,
				});
				if (generation !== this.searchGeneration) return;
				this.items = buildContentItems(contentResults);
			} else if (mode === "headings") {
				this.host.setBadge("Headings", "is-content");
				// Supports `file#heading` scoping and `level:1-2` depth filters.
				const parsed = parseHeadingQuery(body);
				const headingResults = this.headingSearcher.search(parsed.headingQuery, {
					excludeFolders,
					limit: RESULT_LIMIT,
					fileQuery: parsed.fileQuery,
					levelMin: parsed.levelMin,
					levelMax: parsed.levelMax,
					ignoreDiacritics: this.plugin.settings.ranking.ignoreDiacritics,
				});
				if (generation !== this.searchGeneration) return;
				this.items = buildHeadingItems(headingResults);
			} else if (mode === "symbols") {
				const target = this.host.drillFile() ?? this.app.workspace.getActiveFile();
				this.host.setBadge(target ? `Symbols · ${target.basename}` : "Symbols", "is-content");
				if (!target || target.extension !== "md") {
					this.items = [];
					this.isLoading = false;
					this.host.renderEmptyState(
						"heading",
						"No note to outline",
						"Open a Markdown note, or arrow onto a file result and press the symbols trigger."
					);
					this.host.updateStatus(0);
					return;
				}
				const symbolResults = this.symbolSearcher.search(target, body, SYMBOL_LIMIT, this.plugin.settings.ranking.ignoreDiacritics);
				if (generation !== this.searchGeneration) return;
				this.items = buildSymbolItems(symbolResults);
			} else if (mode === "editors") {
				this.host.setBadge("Editors", "is-content");
				const editorResults = this.editorSearcher.search(body, RESULT_LIMIT, this.plugin.settings.ranking.ignoreDiacritics);
				if (generation !== this.searchGeneration) return;
				this.items = buildEditorItems(editorResults);
				if (this.items.length === 0) {
					this.isLoading = false;
					this.host.renderEmptyState("layout", "No open editors", "Open a few notes, then jump between their tabs from here.");
					this.host.updateStatus(0);
					return;
				}
			} else if (mode === "folders") {
				this.host.setBadge("Folders", "is-content");
				this.items = this.folderItems(body);
				if (this.items.length === 0) {
					this.isLoading = false;
					this.host.renderEmptyState("folder", "No matching folders", "Press Enter on a folder to browse its files.");
					this.host.updateStatus(0);
					return;
				}
			} else if (mode === "links") {
				const linkTarget = this.host.drillFile() ?? this.app.workspace.getActiveFile();
				this.host.setBadge(linkTarget && !body ? `Links · ${linkTarget.basename}` : "Links", "is-content");
				this.items = this.linkModeItems(body);
				if (this.items.length === 0) {
					this.isLoading = false;
					this.host.renderEmptyState("link", "No linked notes found", "Use Links mode on an active note, or type a note name to inspect backlinks.");
					this.host.updateStatus(0);
					return;
				}
			} else if (mode === "capture") {
				this.host.setBadge("Capture", "is-content");
				this.items = this.captureItems(body);
			} else if (mode === "snippets") {
				this.host.setBadge("Snippets", "is-content");
				this.items = this.snippetItems(body);
				if (this.items.length === 0) {
					this.isLoading = false;
					const hasSnippets = this.plugin.settings.snippets.length > 0;
					this.host.renderEmptyState(
						"clipboard-type",
						hasSnippets ? "No matching snippets" : "No snippets yet",
						hasSnippets
							? "Try a different snippet name."
							: "Add reusable snippets in Settings → Vault Spotlight, then insert them here."
					);
					this.host.updateStatus(0);
					return;
				}
			} else {
				this.host.setBadge(isEmptyQuery ? "Browse" : "Files", null);
				const parsed = tokenizeQuery(body);
				const fileResults = this.fileSearcher.search({
					textTokens: parsed.textTokens,
					phrases: isPro ? parsed.phrases : [],
					exclusions: isPro ? parsed.exclusions : [],
					// in: stays free — folder mode's Enter-to-browse depends on it.
					folderIncludes: parsed.folderIncludes,
					pathTerms: isPro ? parsed.pathTerms : [],
					nameTerms: isPro ? parsed.nameTerms : [],
					tags: parsed.tags,
					properties: parsed.properties,
					extFilters: isPro ? parsed.extFilters : [],
					isStarred: isPro ? parsed.isStarred : false,
					isBookmarked: isPro ? parsed.isBookmarked : false,
					modifiedDays: isPro ? parsed.modifiedDays : null,
					createdDays: isPro ? parsed.createdDays : null,
					// Boolean OR is Pro; free tier degrades to the clause-0 flat fields
					// (already individually Pro-gated above), so an `a OR b` query on
					// free behaves as `a` rather than erroring.
					orClauses: isPro ? parsed.orClauses : null,
					recentPaths: this.plugin.settings.recentPaths,
					starredPaths: isPro ? this.plugin.settings.starredPaths : [],
					bookmarkedPaths: this.plugin.getBookmarkedPaths(),
					openPaths: this.editorSearcher.openFilePaths(),
					includeCanvas: isPro && includeCanvas,
					includePdf: isPro && includePdf,
					includeBases: isPro && includeBases,
					excludeFolders,
					frecency: this.plugin.settings.useFrecency ? this.plugin.settings.fileFrecency : undefined,
					ranking: this.plugin.settings.ranking,
					rankingMode: workflow?.rankingMode ?? profile?.rankingMode,
					limit: isEmptyQuery ? FILE_BROWSE_LIMIT : FILE_QUERY_LIMIT,
				});

				this.items = buildFileItems(fileResults);

				if (isEmptyQuery) {
					// Saved objects (Workflows first, then advanced profiles, then legacy
					// collections) sit above the file list — see buildSavedObjectItems.
					this.items = [...buildSavedObjectItems(this.plugin.settings, isPro), ...this.items];
				}

				// Ambient calculator / date-jump: when the query is a calculation or
				// a natural-language date, surface a result row above the file list.
				// Free — it's the top-of-funnel "wait, it does that?" moment.
				if (!isEmptyQuery) {
					const smartItems = this.computeSmartItems(body);
					if (smartItems.length > 0) this.items = [...smartItems, ...this.items];
				}

				// Offer to create a note when a plain name search finds nothing.
				const noFilters =
					parsed.tags.length === 0 &&
					parsed.properties.length === 0 &&
					parsed.extFilters.length === 0 &&
					parsed.phrases.length === 0 &&
					parsed.exclusions.length === 0 &&
					parsed.folderIncludes.length === 0 &&
					parsed.pathTerms.length === 0 &&
					parsed.nameTerms.length === 0 &&
					!parsed.isStarred &&
					!parsed.isBookmarked &&
					parsed.modifiedDays === null &&
					parsed.createdDays === null;
				if (this.items.length === 0 && !isEmptyQuery && noFilters) {
					this.items = [{ kind: "create", name: body }];
				}
			}
		} catch (err) {
			if (generation !== this.searchGeneration) return;
			console.error("[VaultSpotlight] search failed", err);
			this.items = [];
			this.isLoading = false;
			this.host.renderEmptyState("alert-triangle", "Search failed", "Something went wrong. Try a different query.");
			this.host.updateStatus(0);
			return;
		}

		this.isLoading = false;
		if (preservedKey) {
			const restored = this.items.findIndex((item) => this.itemKey(item) === preservedKey);
			this.selectedIndex = restored >= 0 ? restored : 0;
		} else {
			this.selectedIndex = 0;
		}
		this.host.renderResults();
		this.host.updateStatus(this.items.length);
		this.host.updatePreview();
	}

	/** Stable identity for a result row, used to preserve selection across a
	 * passive re-render. Only file-backed rows have one; others return null. */
	private itemKey(item: ResultItem | undefined): string | null {
		if (!item) return null;
		const file = itemFile(item);
		if (!file) return null;
		const line = "line" in item ? `:${item.line}` : "";
		return `${item.kind}:${file.path}${line}`;
	}

	private fileToResult(file: TFile, score: number, bookmarkedPaths: Set<string>): ResultItem {
		return {
			kind: "file",
			file,
			score,
			matchIndices: [],
			modifiedLabel: "",
			fileKind: getVaultFileKind(file),
			primaryMatch: "browse",
			aliasMatched: false,
			tags: [],
			aliases: [],
			isRecent: this.plugin.settings.recentPaths.includes(file.path),
			isStarred: this.plugin.isStarred(file.path),
			isBookmarked: bookmarkedPaths.has(file.path),
		};
	}

	private linkModeItems(query: string): ResultItem[] {
		const active = this.app.workspace.getActiveFile();
		const files = this.app.vault.getMarkdownFiles();
		const q = query.replace(/^(<-|->|\[\[)\s?/, "").trim().toLowerCase();

		// otherwise the active note.
		const target = this.host.drillFile() ?? (q ? this.bestFileMatch(files, q) : active);
		if (!target) return [];
		const resolvedLinks = this.app.metadataCache.resolvedLinks ?? {};
		let linked = query.trim().startsWith("->")
			? findOutlinks(files, resolvedLinks, target.path)
			: findBacklinks(files, resolvedLinks, target.path);
		// When drilled in, the query text filters the linked notes themselves
		// (the target is already fixed) instead of being ignored.
		if (this.host.drillFile() && q) {
			linked = linked.filter((file) => fuzzyMatch(q, file.basename) ?? fuzzyMatch(q, file.path));
		}
		// Walk the bookmark tree once for the whole result set, not per row.
		const bookmarkedPaths = new Set(this.plugin.getBookmarkedPaths());
		return linked.slice(0, RESULT_LIMIT).map((file, index) => this.fileToResult(file, 1000 - index, bookmarkedPaths));
	}

	/** The highest-scoring fuzzy match for `q`, not just the first substring hit. */
	private bestFileMatch(files: TFile[], q: string): TFile | null {
		let best: TFile | null = null;
		let bestScore = -1;
		for (const file of files) {
			const match = fuzzyMatch(q, file.basename) ?? fuzzyMatch(q, file.path);
			if (match && match.score > bestScore) {
				best = file;
				bestScore = match.score;
			}
		}
		return best;
	}

	private folderItems(query: string): ResultItem[] {
		const q = query.trim();
		const rows: Array<{ folder: TFolder; score: number; indices: number[] }> = [];
		for (const abstract of this.app.vault.getAllLoadedFiles()) {
			if (!(abstract instanceof TFolder) || abstract.isRoot()) continue;
			if (q.length === 0) {
				rows.push({ folder: abstract, score: 1, indices: [] });
				continue;
			}
			const nameMatch = fuzzyMatch(q, abstract.name);
			const match = nameMatch ?? fuzzyMatch(q, abstract.path);
			if (!match) continue;
			rows.push({
				folder: abstract,
				// Prefer name hits; path-only hits rank at a discount and get no
				// highlight (indices would point into the path, not the name).
				score: nameMatch ? match.score + 10 : Math.floor(match.score / 2),
				indices: nameMatch ? match.indices : [],
			});
		}
		rows.sort((a, b) => b.score - a.score || a.folder.path.localeCompare(b.folder.path));
		return rows.slice(0, RESULT_LIMIT).map((row) => ({
			kind: "folder" as const,
			folder: row.folder,
			matchIndices: row.indices,
		}));
	}

	// --- Delight layer: calculator, dates, capture, snippets -----------------

	private currencyRates(): Record<string, number> {
		return parseCurrencyRates(this.plugin.settings.currencyRates);
	}

	/**
	 * Ambient calculator / natural-language date rows for the files mode. Returns
	 * at most one row (a calculation takes precedence over a date), or none when
	 * the query is ordinary text — so plain searches are never intercepted.
	 */
	private computeSmartItems(body: string): ResultItem[] {
		const text = body.trim();
		if (!text) return [];
		// Dates are checked BEFORE the calculator so an ISO date like 2026-07-24
		// resolves to a daily-note jump instead of being evaluated as 2026-7-24.
		if (this.plugin.settings.enableDateJump) {
			const date = parseNaturalDate(text);
			if (date) {
				const { path, exists } = this.host.capture.resolveDatePath(date.date);
				return [{ kind: "datejump", date: date.date, label: date.label, path, exists }];
			}
		}
		if (this.plugin.settings.enableCalculator) {
			const calc = evaluateExpression(text, { rates: this.currencyRates() });
			if (calc) {
				const detail =
					calc.kind === "currency"
						? "Currency · your rates"
						: calc.kind === "unit"
							? "Unit conversion"
							: calc.kind === "temp"
								? "Temperature"
								: calc.kind === "percent"
									? "Percentage"
									: "Calculator";
				return [{ kind: "calc", expression: calc.expression, result: calc.formatted, detail }];
			}
		}
		return [];
	}

	private captureItems(body: string): ResultItem[] {
		const text = body.trim();
		const dailyName = formatMoment().format(this.host.capture.dailyNoteConfig().format);
		const captureHeading = this.plugin.settings.isPro ? this.plugin.settings.captureHeading : "";
		const captureMode = this.plugin.settings.isPro ? this.plugin.settings.captureMode : "append";
		const items: ResultItem[] = [
			{
				kind: "capture",
				text,
				target: "daily",
				label: "Daily note",
				description: describeCaptureTarget({
					hasText: text.length > 0,
					targetLabel: dailyName,
					mode: captureMode,
					heading: captureHeading,
				}),
			},
		];
		const inbox = this.plugin.settings.captureInboxPath.trim();
		if (this.plugin.settings.isPro && inbox) {
			items.push({
				kind: "capture",
				text,
				target: "inbox",
				label: "Inbox",
				description: describeCaptureTarget({
					hasText: text.length > 0,
					targetLabel: inbox,
					mode: captureMode,
					heading: captureHeading,
				}),
			});
		}
		return items;
	}

	private snippetItems(query: string): ResultItem[] {
		const q = query.trim().toLowerCase();
		const rows: Array<{ id: string; name: string; body: string; score: number; indices: number[] }> = [];
		for (const snippet of this.plugin.settings.snippets) {
			if (!q) {
				rows.push({ id: snippet.id, name: snippet.name, body: snippet.body, score: 1, indices: [] });
				continue;
			}
			const nameMatch = fuzzyMatch(q, snippet.name);
			const match = nameMatch ?? fuzzyMatch(q, snippet.body);
			if (!match) continue;
			rows.push({
				id: snippet.id,
				name: snippet.name,
				body: snippet.body,
				score: nameMatch ? match.score + 10 : match.score,
				indices: nameMatch ? nameMatch.indices : [],
			});
		}
		rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
		return rows.slice(0, RESULT_LIMIT).map((row) => ({
			kind: "snippet" as const,
			id: row.id,
			name: row.name,
			body: row.body,
			matchIndices: row.indices,
		}));
	}

	/**
	 * Drop checked paths that are no longer among the visible results. The
	 * multi-select set is keyed by path and survives query changes; without this
	 * the footer would report "N selected" for files that have scrolled out of
	 * the result set, and a batch action (which falls back to "all results" when
	 * the checked intersection is empty) could silently mutate the WRONG files.
	 * Skipped while the action palette is open, where `items` holds actions, not
	 * results, and the checked set must survive into the batch operation.
	 */
	pruneCheckedToVisible(): void {
		if (this.checkedPaths.size === 0) return;
		const visible = new Set<string>();
		for (const item of this.items) {
			const file = itemFile(item);
			if (file) visible.add(file.path);
		}
		for (const path of Array.from(this.checkedPaths)) {
			if (!visible.has(path)) this.checkedPaths.delete(path);
		}
	}

	recordSearch(): void {
		const raw = this.host.inputValue().trim();
		if (!raw) return;
		// Strip mode prefixes so history stores the plain query text.
		const { body } = this.host.resolveQuery(raw);
		if (body.length > 0) this.plugin.trackSearch(body);
	}

	/** Terms to highlight in the preview for the current selection. */
	previewHighlightTerms(item: ResultItem | undefined): string[] {
		if (!item) return [];
		if (item.kind === "heading") return [item.heading];
		if (item.kind === "symbol" && item.symbolType === "heading") return [item.text];
		if (item.kind === "content") {
			const { body } = this.host.resolveQuery(this.host.inputValue());
			return body.split(/\s+/).filter(Boolean);
		}
		return [];
	}
}
