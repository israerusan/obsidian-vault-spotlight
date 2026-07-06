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

export const MAX_SAVED_WORKFLOWS: number;

export function buildSavedWorkflows(legacy: {
	workflowPresets?: unknown[];
	searchProfiles?: unknown[];
	customSearches?: unknown[];
	pinnedCustomSearchIds?: string[];
}): SavedWorkflow[];

export function migratedActiveWorkflowId(legacy: { activeProfileId?: string }): string;

export function normalizeSavedWorkflows(raw: unknown): SavedWorkflow[];

export function createSavedWorkflow(
	name: string,
	mode: string,
	query: string,
	options?: Partial<Omit<SavedWorkflow, "id" | "name" | "mode" | "query">>
): SavedWorkflow;

export function canSaveSavedWorkflow(savedWorkflows: unknown, isPro: boolean): boolean;

export function resolveSavedWorkflows(savedWorkflows: unknown, workflowPresets: unknown): SavedWorkflow[];
