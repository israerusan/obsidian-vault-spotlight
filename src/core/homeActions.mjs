/**
 * The home "Quick actions" cluster shown above the browse list when the launcher
 * opens on an empty query — the "act immediately on open" surface. Pure descriptor
 * selection (which actions to offer + their static copy/icon) so it is unit-testable
 * without Obsidian: SearchController turns each descriptor into a `quickaction`
 * ResultItem and ModeController performs the side effect on activation.
 *
 * Order is deliberate. Capture is first because activating it is a NON-DESTRUCTIVE
 * mode switch (the user then types and confirms), so a reflexive Enter on a freshly
 * opened, empty launcher lands somewhere harmless. Today's daily note — which may
 * CREATE a file — sits one row below it, and is offered only when the date-jump
 * delight layer is enabled (it shares the same Daily Notes / Periodic Notes config).
 *
 * @param {{ enableDateJump?: boolean }} [options]
 * @returns {Array<{ action: "capture" | "daily-today", icon: string, label: string, description: string }>}
 */
export function homeActionDescriptors(options = {}) {
	const enableDateJump = options.enableDateJump !== false;
	const actions = [
		{
			action: "capture",
			icon: "plus-circle",
			label: "Quick capture",
			description: "Jot a line into your daily note or inbox",
		},
	];
	if (enableDateJump) {
		actions.push({
			action: "daily-today",
			icon: "calendar-days",
			label: "Today's daily note",
			description: "Open or create today's daily note",
		});
	}
	return actions;
}
