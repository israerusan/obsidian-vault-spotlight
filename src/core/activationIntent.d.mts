export type PaneTarget = "tab" | "split" | "window" | null;

export function resolveOpenTargets(params: {
	selectedPath: string | null;
	checkedPaths: string[];
	visiblePaths: string[];
	paneOverride?: PaneTarget;
	defaultNewTab?: boolean;
}): { paths: string[]; target: PaneTarget; isBatch: boolean };
