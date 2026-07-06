export interface FeatureGate {
	proOnly: boolean;
	freeLimit?: number;
	label: string;
	mode?: string;
}

export type FeatureKey =
	| "fileLauncher"
	| "tagPropertyFilters"
	| "quickActions"
	| "actionPalette"
	| "rankingControls"
	| "workflows"
	| "contentSearch"
	| "headingSearch"
	| "linksMode"
	| "snippets"
	| "previewPane"
	| "batchActions"
	| "searchProfiles"
	| "canvasPdfBases";

export const FREE_WORKFLOW_LIMIT: number;
export const PRO_ONLY_MODES: ReadonlySet<string>;
export const FEATURES: Readonly<Record<FeatureKey, FeatureGate>>;
export const PRO_UNLOCK_SUMMARY: string;

export function isProOnlyMode(mode: string): boolean;
export function isFeatureEnabled(feature: FeatureGate | FeatureKey, isPro: boolean): boolean;
export function featureFreeLimit(feature: FeatureGate | FeatureKey): number;
export function withinFreeLimit(feature: FeatureGate | FeatureKey, count: number, isPro: boolean): boolean;
