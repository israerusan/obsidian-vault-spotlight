import type { ProfileMode } from "./searchProfiles.d.mts";
import type { RankingMode } from "./ranking.d.mts";

export interface WorkflowPreset {
	id: string;
	name: string;
	query: string;
	mode: ProfileMode;
	profileId: string;
	pinned: boolean;
	starter?: boolean;
	rankingMode?: RankingMode;
}

export const FREE_WORKFLOW_LIMIT: number;
export const MAX_WORKFLOW_PRESETS: number;
export const STARTER_WORKFLOWS: WorkflowPreset[];
export function normalizeWorkflowPresets(raw: unknown): WorkflowPreset[];
export function ensureStarterWorkflows(workflows: unknown): WorkflowPreset[];
export function canSaveWorkflowPreset(workflows: unknown, isPro: boolean): boolean;
export function createWorkflowPreset(
	name: string,
	mode: string,
	query: string,
	options?: Partial<WorkflowPreset>
): WorkflowPreset;
