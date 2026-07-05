// Pure result-building for the Spotlight search orchestration: turn each searcher's
// raw output (and the plugin settings) into the modal's ResultItem list. Extracted
// from SpotlightModal.runSearch so the "how results become list items" concern is
// isolated and independently readable/testable; the modal keeps the async lifecycle
// (debounce, the searchGeneration race-guard, rendering). No Obsidian/DOM access.
import type { CommandResult } from "../search/CommandSearcher";
import type { ContentSearchResult } from "../search/ContentSearcher";
import type { HeadingResult } from "../search/HeadingSearcher";
import type { SymbolResult } from "../search/SymbolSearcher";
import type { EditorResult } from "../search/EditorSearcher";
import type { FileSearchResult } from "../search/FileSearcher";
import type { ResultItem } from "./resultTypes";
import type { VaultSpotlightSettings } from "../settings";
import { ensureStarterWorkflows, normalizeWorkflowPresets, FREE_WORKFLOW_LIMIT } from "../core/workflowPresets.mjs";

/** Command rows, with recently-run commands floated to the top on an empty query. */
export function buildCommandItems(
	results: CommandResult[],
	recentIds: string[],
	isEmptyQuery: boolean,
	limit: number
): ResultItem[] {
	let ordered = results;
	if (isEmptyQuery && recentIds.length > 0) {
		const byId = new Map(results.map((r) => [r.id, r]));
		const recent = recentIds.map((id) => byId.get(id)).filter((r): r is CommandResult => !!r);
		const recentSet = new Set(recent.map((r) => r.id));
		ordered = [...recent, ...results.filter((r) => !recentSet.has(r.id))];
	}
	const recentSet = new Set(isEmptyQuery ? recentIds : []);
	return ordered.slice(0, limit).map((r) => ({
		kind: "command" as const,
		id: r.id,
		name: r.name,
		matchIndices: r.matchIndices,
		isRecent: recentSet.has(r.id),
	}));
}

export function buildContentItems(results: ContentSearchResult[]): ResultItem[] {
	return results.map((r) => ({
		kind: "content" as const,
		file: r.file,
		line: r.line,
		snippet: r.snippet,
		score: r.score,
		engine: r.engine,
		matchIndices: r.matchIndices ?? [],
	}));
}

export function buildHeadingItems(results: HeadingResult[]): ResultItem[] {
	return results.map((r) => ({
		kind: "heading" as const,
		file: r.file,
		line: r.line,
		heading: r.heading,
		level: r.level,
		score: r.score,
		matchIndices: r.matchIndices,
	}));
}

export function buildSymbolItems(results: SymbolResult[]): ResultItem[] {
	return results.map((r) => ({
		kind: "symbol" as const,
		file: r.file,
		line: r.line,
		text: r.text,
		symbolType: r.symbolType,
		level: r.level,
		matchIndices: r.matchIndices,
	}));
}

export function buildEditorItems(results: EditorResult[]): ResultItem[] {
	return results.map((r) => ({
		kind: "editor" as const,
		leaf: r.leaf,
		file: r.file,
		title: r.title,
		viewType: r.viewType,
		isActive: r.isActive,
		isPinned: r.isPinned,
		matchIndices: r.matchIndices,
	}));
}

export function buildFileItems(results: FileSearchResult[]): ResultItem[] {
	return results.map((r) => ({
		kind: "file" as const,
		file: r.file,
		score: r.score,
		matchIndices: r.matchIndices,
		modifiedLabel: r.modifiedLabel,
		fileKind: r.fileKind,
		primaryMatch: r.primaryMatch,
		aliasMatched: r.aliasMatched,
		tags: r.tags,
		aliases: r.aliases,
		isRecent: r.isRecent,
		isStarred: r.isStarred,
		isBookmarked: r.isBookmarked,
	}));
}

/**
 * The saved-object rows shown above the file list in Browse, most-canonical first:
 * Workflows (the primary saved object) on top, then advanced Search profiles, then
 * the legacy "Smart collections" (retired custom searches) last. Free shows only the
 * user's own workflows (capped); Pro is unlimited and gets curated starters seeded.
 */
export function buildSavedObjectItems(settings: VaultSpotlightSettings, isPro: boolean): ResultItem[] {
	const workflowSource = isPro
		? ensureStarterWorkflows(settings.workflowPresets)
		: normalizeWorkflowPresets(settings.workflowPresets).slice(0, FREE_WORKFLOW_LIMIT);
	const workflowItems: ResultItem[] = workflowSource
		.slice()
		.sort((a, b) => Number(b.pinned) - Number(a.pinned) || Number(b.starter ?? false) - Number(a.starter ?? false) || a.name.localeCompare(b.name))
		.map((workflow) => ({
			kind: "workflow" as const,
			id: workflow.id,
			name: workflow.name,
			query: workflow.query,
			mode: workflow.mode,
			profileId: workflow.profileId,
			isPinned: workflow.pinned,
			isStarter: workflow.starter ?? false,
			rankingMode: workflow.rankingMode,
		}));

	const profileItems: ResultItem[] =
		isPro && settings.searchProfiles.length > 0
			? settings.searchProfiles.map((searchProfile) => ({
					kind: "profile" as const,
					id: searchProfile.id,
					name: searchProfile.name,
					defaultMode: searchProfile.defaultMode,
					defaultQuery: searchProfile.defaultQuery,
					isActive: searchProfile.id === settings.activeProfileId,
				}))
			: [];

	let collectionItems: ResultItem[] = [];
	if (isPro && settings.customSearches.length > 0) {
		const pinned = new Set(settings.pinnedCustomSearchIds);
		collectionItems = settings.customSearches
			.slice()
			.sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)) || a.name.localeCompare(b.name))
			.map((search) => ({
				kind: "collection" as const,
				id: search.id,
				name: search.name,
				query: search.query,
				isPinned: pinned.has(search.id),
			}));
	}

	return [...workflowItems, ...profileItems, ...collectionItems];
}
