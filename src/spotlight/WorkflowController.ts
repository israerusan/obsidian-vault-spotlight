import { App, Notice } from "obsidian";
import type VaultSpotlightPlugin from "../main";
import { PromptModal } from "./PromptModal";
import { activeProfile, createProfileFromSettings, MAX_SEARCH_PROFILES } from "../core/searchProfiles.mjs";
import { canSaveWorkflowPreset, createWorkflowPreset, ensureStarterWorkflows, FREE_WORKFLOW_LIMIT, MAX_WORKFLOW_PRESETS } from "../core/workflowPresets.mjs";
import type { RankingMode } from "../core/ranking.mjs";
import type { SpotlightMode } from "./resultTypes";

/**
 * What saving/applying profiles, workflows, and custom searches needs from the
 * modal. Mutable modal state (mode / query / actionContext / activeWorkflowId) stays
 * OWNED by the modal and is reached through accessors, so a controller can never
 * hold a stale copy. Same host-seam idea as batchOps / CaptureController.
 */
export interface WorkflowHost {
	app: App;
	plugin: VaultSpotlightPlugin;
	/** The live mode/query when the action palette is closed. */
	liveMode(): SpotlightMode;
	liveQuery(): string;
	/** With the palette open the live input is cleared, so the real mode/query live here. */
	hasActionContext(): boolean;
	actionReturnMode(): SpotlightMode;
	actionReturnQuery(): string;
	clearActionContext(): void;
	setMode(mode: SpotlightMode): void;
	setQuery(query: string): void;
	setActiveWorkflowId(id: string): void;
	currentProfileRankingMode(): RankingMode | undefined;
	focusInput(): void;
	runSearch(): void;
	closeActionPalette(): void;
}

/**
 * Saved-search control extracted from SpotlightModal: activate/clear a search
 * profile, apply a saved workflow, and save the current context as a profile /
 * workflow / custom search. Normalization + limits stay in core
 * (searchProfiles.mjs / workflowPresets.mjs); this owns the settings writes and the
 * prompt flows.
 */
export class WorkflowController {
	constructor(private host: WorkflowHost) {}

	private get settings() {
		return this.host.plugin.settings;
	}

	activateProfile(id: string): void {
		const profile = activeProfile(this.settings.searchProfiles, id);
		if (!profile) return;
		this.settings.activeProfileId = profile.id;
		void this.host.plugin.saveSettings();
		this.host.clearActionContext();
		this.host.setMode(profile.defaultMode);
		this.host.setQuery(profile.defaultQuery);
		this.host.focusInput();
		this.host.runSearch();
	}

	clearProfile(): void {
		this.settings.activeProfileId = "";
		void this.host.plugin.saveSettings();
		this.host.clearActionContext();
		this.host.setQuery("");
		this.host.setMode("files");
		this.host.runSearch();
	}

	applyWorkflow(id: string): void {
		const workflows = ensureStarterWorkflows(this.settings.workflowPresets);
		const workflow = workflows.find((entry) => entry.id === id);
		if (!workflow) return;
		this.host.setActiveWorkflowId(workflow.id);
		this.host.clearActionContext();
		if (workflow.profileId) {
			this.settings.activeProfileId = workflow.profileId;
		}
		this.host.setMode(workflow.mode);
		this.host.setQuery(workflow.query);
		void this.host.plugin.saveSettings();
		this.host.focusInput();
		this.host.runSearch();
	}

	saveCurrentProfile(): void {
		new PromptModal(this.host.app, {
			title: "Save search profile",
			initial: "New profile",
			cta: "Save profile",
			onSubmit: (name) => {
				const mode = this.host.hasActionContext() ? this.host.actionReturnMode() : this.host.liveMode();
				const query = this.host.hasActionContext() ? this.host.actionReturnQuery() : this.host.liveQuery();
				// createProfileFromSettings now dedups the id against existing profiles,
				// so a name that slugifies to an existing id gets a distinct one (rather
				// than replacing it) — no manual collision suffix needed here.
				const profile = createProfileFromSettings(name, this.settings, mode, query, this.settings.searchProfiles.map((p) => p.id));
				this.settings.searchProfiles = [...this.settings.searchProfiles, profile].slice(0, MAX_SEARCH_PROFILES);
				void this.host.plugin.saveSettings();
				new Notice("Vault Spotlight: search profile saved.");
				this.host.closeActionPalette();
			},
		}).open();
	}

	saveCurrentWorkflow(): void {
		// Reachable via Mod+S whether or not the action palette is open. With the
		// palette open the live input is cleared, so the real mode/query live in
		// actionReturn*; otherwise the current mode/input are authoritative. Key off
		// actionContext rather than a truthiness fallback — "files" is truthy, so
		// `|| liveMode` could never reach the live mode.
		const mode = this.host.hasActionContext() ? this.host.actionReturnMode() : this.host.liveMode();
		const query = (this.host.hasActionContext() ? this.host.actionReturnQuery() : this.host.liveQuery()).trim();
		if (!canSaveWorkflowPreset(this.settings.workflowPresets, this.settings.isPro)) {
			new Notice(`Vault Spotlight: the free plan includes ${FREE_WORKFLOW_LIMIT} workflows — upgrade to Pro for unlimited.`);
			return;
		}
		new PromptModal(this.host.app, {
			title: "Save workflow",
			initial: query.slice(0, 40) || "New workflow",
			cta: "Save workflow",
			onSubmit: (name) => {
				const workflow = createWorkflowPreset(name, mode, query, {
					profileId: this.settings.activeProfileId,
					rankingMode: this.host.currentProfileRankingMode(),
				});
				// Two workflows whose names slugify to the same id (e.g. both "Meeting")
				// would otherwise coexist, and settings pin/remove match by id —
				// Remove-one would delete both. Suffix a colliding id.
				const exists = this.settings.workflowPresets.some((w) => w.id === workflow.id);
				if (exists) workflow.id = `${workflow.id}-${Date.now()}`;
				this.settings.workflowPresets = [workflow, ...this.settings.workflowPresets].slice(0, MAX_WORKFLOW_PRESETS);
				this.host.setActiveWorkflowId(workflow.id);
				void this.host.plugin.saveSettings();
				new Notice("Vault Spotlight: workflow saved.");
				this.host.closeActionPalette();
			},
		}).open();
	}

}
