// Builds the "Actions" palette (Cmd/Ctrl+K) descriptor list for a selected result.
// Extracted from SpotlightModal.availableActions so the Actions concern lives in one
// place; the modal supplies an ActionHost of bound operations (its controllers, batch
// context, and a few callbacks) so its internals stay private. Pure list-building —
// the `run` closures defer to the host. Order of pushes = order shown in the palette.
import type { App, TFile } from "obsidian";
import { itemFile, type ResultItem, type SpotlightAction } from "./resultTypes";
import * as batchOps from "./batchOps";
import type { SearchIntegrations } from "../core/integrations.mjs";
import type VaultSpotlightPlugin from "../main";
import type { WorkflowController } from "./WorkflowController";
import type { CaptureController } from "./CaptureController";

/** Everything the action `run` closures need from the modal. */
export interface ActionHost {
	app: App;
	plugin: VaultSpotlightPlugin;
	workflows: Pick<WorkflowController, "activateProfile" | "clearProfile" | "saveCurrentProfile">;
	capture: Pick<
		CaptureController,
		"copyCalcResult" | "insertCalcResult" | "openOrCreateDatedNote" | "runCapture" | "insertSnippet"
	>;
	integrations(): SearchIntegrations;
	/** Available Bases Power Pack views for a `.base` file (empty unless PP premium). */
	basesPowerPackViews(file: TFile): ReadonlyArray<readonly [view: string, label: string]>;
	handoffBaseToPowerPack(view: string, path: string): void;
	batchContext(): batchOps.BatchOpsContext;
	resultItemsForBatch(): ResultItem[];
	runIntegrationCommand(name: string): void;
	/** Close the modal, open the result, and record it as recent. */
	openResultAndClose(context: ResultItem): void | Promise<void>;
	/** Exit the action palette and run the collection's saved query. */
	runCollectionQuery(query: string): void;
	closeActionPalette(): void;
}

export function buildAvailableActions(context: ResultItem, host: ActionHost): SpotlightAction[] {
	if (context.kind === "profile") {
		return [
			{
				id: "activate-profile",
				name: "Activate search profile",
				description: `Switch to ${context.name} and run its default query.`,
				requiresPro: true,
				run: () => host.workflows.activateProfile(context.id),
			},
			{
				id: "clear-profile",
				name: "Clear active profile",
				description: "Return Spotlight to the global search settings.",
				requiresPro: true,
				run: () => host.workflows.clearProfile(),
			},
		];
	}

	if (context.kind === "collection") {
		return [
			{
				id: "run-collection",
				name: "Run smart collection",
				description: context.query,
				run: () => host.runCollectionQuery(context.query),
			},
			{
				id: "pin-collection",
				name: context.isPinned ? "Unpin smart collection" : "Pin smart collection",
				description: "Keep this saved search at the top of the browse view.",
				requiresPro: true,
				run: () => {
					host.plugin.togglePinnedCollection(context.id);
					host.closeActionPalette();
				},
			},
			{
				id: "copy-collection-query",
				name: "Copy collection query",
				description: "Copy the saved search query to the clipboard.",
				run: () => batchOps.copyToClipboard(context.query, "Query copied"),
			},
		];
	}

	// Delight rows get their own contextual actions instead of the generic file-batch
	// palette, which has nothing to do with a calc/date/snippet row.
	if (context.kind === "calc") {
		return [
			{
				id: "copy-calc",
				name: "Copy result",
				description: `Copy ${context.result} to the clipboard.`,
				run: () => host.capture.copyCalcResult(context),
			},
			{
				id: "insert-calc",
				name: "Insert at cursor",
				description: "Insert the result into the active note.",
				run: () => host.capture.insertCalcResult(context),
			},
		];
	}
	if (context.kind === "datejump") {
		return [
			{
				id: "open-daily",
				name: context.exists ? "Open daily note" : "Create daily note",
				description: context.path,
				run: () => void host.capture.openOrCreateDatedNote(context.date),
			},
		];
	}
	if (context.kind === "capture") {
		return [
			{
				id: "run-capture",
				name: "Capture",
				description: context.description,
				run: () => void host.capture.runCapture(context),
			},
		];
	}
	if (context.kind === "snippet") {
		return [
			{
				id: "insert-snippet",
				name: "Insert snippet",
				description: "Insert this snippet at the cursor.",
				requiresPro: true,
				run: () => void host.capture.insertSnippet(context),
			},
			{
				id: "copy-snippet",
				name: "Copy snippet",
				description: "Copy the snippet body to the clipboard.",
				run: () => batchOps.copyToClipboard(context.body, "Snippet copied"),
			},
		];
	}

	const file = itemFile(context);
	const actions: SpotlightAction[] = [];
	if (file) {
		actions.push(
			{
				id: "open",
				name: "Open",
				description: "Open the selected result.",
				run: () => host.openResultAndClose(context),
			},
			{
				id: "copy-link",
				name: "Copy link",
				description: "Copy a Markdown link for this result.",
				run: () => batchOps.copyToClipboard(host.app.fileManager.generateMarkdownLink(file, ""), "Link copied"),
			},
			{
				id: "copy-path",
				name: "Copy path",
				description: "Copy this file path.",
				run: () => batchOps.copyToClipboard(file.path, "Path copied"),
			},
			{
				id: "rename",
				name: "Rename",
				description: "Rename the selected note or file.",
				// Rename is free (a basic file operation) and available from both the action
				// palette and the right-click / Alt+Enter menu — intentionally consistent.
				run: () => batchOps.renameFile(host.app, file),
			},
			{
				id: "toggle-star",
				name: host.plugin.isStarred(file.path) ? "Unstar" : "Star",
				description: "Toggle the selected file in Starred pins.",
				requiresPro: true,
				run: () => {
					host.plugin.toggleStar(file.path);
					host.closeActionPalette();
				},
			}
		);
	}

	const integrations = host.integrations();

	// Handoff: open a .base result in a Bases Power Pack view. Only offered when the
	// Power Pack API reports premium (basesPowerPackViews returns [] otherwise), so
	// Lite users never see menu items that can only fail.
	if (file) {
		for (const [view, label] of host.basesPowerPackViews(file)) {
			actions.push({
				id: `open-base-${view}`,
				name: `Open in ${label} view`,
				description: `Open this base in Bases Power Pack's ${label} view.`,
				run: () => host.handoffBaseToPowerPack(view, file.path),
			});
		}
	}

	actions.push({
		id: "save-profile",
		name: "Save current setup as profile",
		description: "Create a Pro search profile from the current mode, query, preview, file type, and folder settings.",
		requiresPro: true,
		run: () => host.workflows.saveCurrentProfile(),
	});

	// The batch/export block operates on files. Only offer it when the result set
	// actually contains files, so a command/folder/workflow row never surfaces a
	// batch action that would act on the wrong set.
	if (host.resultItemsForBatch().length > 0) {
		// All batch/export actions are Pro and share the same shape; drive them from
		// one table instead of ten near-identical object literals.
		const batchActions: Array<[id: string, name: string, description: string, run: () => void]> = [
			["copy-results", "Copy results as Markdown", "Copy selected results, or the current result list, as Markdown links.", () => batchOps.copyResultsAsMarkdown(host.batchContext())],
			["export-results", "Export results to note", "Create a Markdown note containing selected/search results.", () => batchOps.exportResultsToNote(host.batchContext())],
			["batch-add-tag", "Batch add tag", "Append a tag to selected Markdown files.", () => batchOps.batchAddTag(host.batchContext())],
			["batch-remove-tag", "Batch remove tag", "Remove a tag from selected Markdown files.", () => batchOps.batchRemoveTag(host.batchContext())],
			["batch-set-property", "Batch set property", "Set a frontmatter property on selected Markdown files.", () => batchOps.batchSetProperty(host.batchContext())],
			["batch-move", "Batch move files", "Move selected files into a target folder.", () => batchOps.batchMoveFiles(host.batchContext())],
			["batch-star", "Batch star results", "Add selected/current result files to Starred pins.", () => batchOps.batchSetStarred(host.batchContext(), true)],
			["batch-unstar", "Batch unstar results", "Remove selected/current result files from Starred pins.", () => batchOps.batchSetStarred(host.batchContext(), false)],
			["create-moc", "Create MOC from results", "Create a grouped index note from selected/current results.", () => batchOps.createMocFromResults(host.batchContext())],
			["append-links", "Append links to active note", "Append selected/current result links to the active Markdown note.", () => batchOps.appendLinksToActiveNote(host.batchContext())],
		];
		for (const [id, name, description, run] of batchActions) {
			actions.push({ id, name, description, requiresPro: true, run });
		}
		if (integrations.omnisearch) {
			actions.push({
				id: "open-omnisearch",
				name: "Search in Omnisearch",
				description: "Hand off to the installed Omnisearch plugin.",
				requiresPro: true,
				run: () => host.runIntegrationCommand("omnisearch"),
			});
		}
		if (integrations.textExtractor) {
			actions.push({
				id: "open-text-extractor",
				name: "Run Text Extractor",
				description: "Use the installed Text Extractor plugin for document/PDF text support.",
				requiresPro: true,
				run: () => host.runIntegrationCommand("text extractor"),
			});
		}
	}
	return actions;
}
