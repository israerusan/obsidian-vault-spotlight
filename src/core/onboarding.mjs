/**
 * First-run onboarding state — pure, so the "new user?" signal is testable and
 * shared by the modal (hint density) and main (capped open counter). The plugin
 * shows the full trigger cheatsheet for the first few opens, then condenses it
 * once the user has plausibly learned the triggers.
 */

/** Show the full first-run guidance for this many opens. */
export const ONBOARDING_MAX_OPENS = 5;
/** Stop counting past here so a long-time user's data.json stops being rewritten. */
export const OPEN_COUNT_CAP = 50;

/** Coerce a persisted open count to a non-negative integer (0 for anything bad). */
export function coerceOpenCount(value) {
	return Number.isInteger(value) && value >= 0 ? value : 0;
}

/** Next open count, capped so it eventually stops writing to disk. */
export function nextOpenCount(value) {
	const n = coerceOpenCount(value);
	return n < OPEN_COUNT_CAP ? n + 1 : n;
}

/**
 * Whether to show the full first-run onboarding guidance. False once the user has
 * opened the launcher enough times or explicitly dismissed it.
 * @param {number} openCount
 * @param {boolean} [dismissed]
 */
export function showOnboarding(openCount, dismissed) {
	return dismissed !== true && coerceOpenCount(openCount) < ONBOARDING_MAX_OPENS;
}
