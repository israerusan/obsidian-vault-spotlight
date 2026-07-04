/**
 * Pure decision for what an Enter/open activation opens and where. The modal
 * supplies the highlighted row's file path, the checked paths, and the file
 * paths of the rows currently in view; this resolves batch-vs-single and the
 * pane target. Extracted because this is the subtly-stateful "open" journey the
 * modal previously computed inline — worth unit-testing away from the DOM.
 *
 * Rules preserved from activateSelection:
 * - With checked rows, open the checked rows THAT ARE STILL IN VIEW. If the query
 *   changed so none are in view (a stale checked set), fall back to the single
 *   highlighted row rather than silently opening nothing.
 * - A multi-file (batch) open always uses tabs; a single open honors the caller's
 *   pane override, then the "open in new tab by default" setting.
 *
 * @param {object} params
 * @param {string|null} params.selectedPath   file path of the highlighted row (null if it has no file)
 * @param {string[]} params.checkedPaths       currently-checked file paths
 * @param {string[]} params.visiblePaths       file paths of the in-view rows, order preserved
 * @param {"tab"|"split"|"window"|null} [params.paneOverride]
 * @param {boolean} [params.defaultNewTab]
 * @returns {{paths: string[], target: "tab"|"split"|"window"|null, isBatch: boolean}}
 */
export function resolveOpenTargets(params) {
	const selectedPath = params.selectedPath || null;
	const paneOverride = params.paneOverride ?? null;
	const defaultNewTab = params.defaultNewTab === true;
	const checked = new Set(Array.isArray(params.checkedPaths) ? params.checkedPaths : []);
	const visible = Array.isArray(params.visiblePaths) ? params.visiblePaths : [];

	const inViewChecked = checked.size > 0 ? visible.filter((p) => checked.has(p)) : [];
	const isBatch = inViewChecked.length > 0;
	const paths = isBatch ? inViewChecked : selectedPath ? [selectedPath] : [];

	const defaultTarget = defaultNewTab ? "tab" : null;
	const target = paths.length > 1 ? "tab" : paneOverride ?? defaultTarget;
	return { paths, target, isBatch };
}
