export type PaneTarget = "tab" | "split" | "window" | null;
/** A caller's pane override; "same" forces the current pane even when "open in new tab by default" is on. */
export type PaneOverride = PaneTarget | "same";

export function resolveOpenTargets(params: {
	selectedPath: string | null;
	checkedPaths: string[];
	visiblePaths: string[];
	paneOverride?: PaneOverride;
	defaultNewTab?: boolean;
}): { paths: string[]; target: PaneTarget; isBatch: boolean };
