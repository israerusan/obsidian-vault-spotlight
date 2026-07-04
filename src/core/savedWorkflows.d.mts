export interface SavedWorkflowScope {
	includeCanvas: boolean;
	includePdf: boolean;
	includeBases: boolean;
	excludeFolders: string[];
	showPreview: boolean;
}

export interface SavedWorkflow {
	id: string;
	name: string;
	query: string;
	mode: string;
	pinned?: boolean;
	starter?: boolean;
	rankingMode?: string;
	scope?: SavedWorkflowScope;
	sticky?: boolean;
	exposeAsCommand?: boolean;
}

export function buildSavedWorkflows(legacy: {
	workflowPresets?: unknown[];
	searchProfiles?: unknown[];
	customSearches?: unknown[];
	pinnedCustomSearchIds?: string[];
}): SavedWorkflow[];

export function migratedActiveWorkflowId(legacy: { activeProfileId?: string }): string;
