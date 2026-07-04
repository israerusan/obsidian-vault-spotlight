/**
 * Pure list-navigation math for the Spotlight result list — no DOM. The modal
 * owns the DOM side effects (scroll, restyle); this decides *which* index a
 * navigation command lands on, clamped to the list bounds. Extracted so the
 * navigate journey (arrows / Home / End / PageUp / PageDown / Ctrl+N/P) is
 * unit-testable without an Obsidian modal.
 *
 * Deliberately clamps at the ends rather than wrapping: teleporting from the
 * first row to a distant last row is disorienting and loses the user's place,
 * which is why every premium launcher clamps.
 */

/** Clamp an index into [0, count-1]; 0 for an empty list. */
export function clampIndex(index, count) {
	if (!(count > 0)) return 0;
	return Math.min(Math.max(index, 0), count - 1);
}

/**
 * Resolve a navigation command to the next selected index.
 * @param {number} current current index
 * @param {number} count number of items
 * @param {{type: "move"|"page"|"first"|"last", delta?: number, pageSize?: number}} command
 * @returns {number} clamped target index
 */
export function nextSelectedIndex(current, count, command) {
	const type = command && command.type;
	switch (type) {
		case "first":
			return clampIndex(0, count);
		case "last":
			return clampIndex(count - 1, count);
		case "page": {
			const step = Math.max(1, Math.floor(command.pageSize) || 1);
			return clampIndex(current + (command.delta || 0) * step, count);
		}
		case "move":
		default:
			return clampIndex(current + ((command && command.delta) || 0), count);
	}
}
