import assert from "node:assert";
import { homeActionDescriptors } from "../src/core/homeActions.mjs";

// Capture is always offered and always first, so the default (index 0) selection on
// an empty launcher is the non-destructive mode switch, never a note-creating one.
{
	const actions = homeActionDescriptors({ enableDateJump: true });
	assert.equal(actions[0].action, "capture", "capture is the first quick action");
	assert.ok(
		actions.every((a) => a.icon && a.label && a.description),
		"every descriptor carries icon + label + description copy"
	);
}

// Today's daily note tracks the date-jump delight layer: present when enabled...
{
	const actions = homeActionDescriptors({ enableDateJump: true });
	assert.ok(
		actions.some((a) => a.action === "daily-today"),
		"daily-today is offered when date jump is enabled"
	);
	assert.equal(actions.length, 2, "capture + daily-today when date jump is on");
}

// ...and gone when the date-jump layer is off, leaving capture as the sole action.
{
	const actions = homeActionDescriptors({ enableDateJump: false });
	assert.ok(
		!actions.some((a) => a.action === "daily-today"),
		"daily-today is withheld when date jump is disabled"
	);
	assert.equal(actions.length, 1, "only capture remains when date jump is off");
	assert.equal(actions[0].action, "capture");
}

// Defaults: an omitted options object behaves as date-jump-enabled (the setting
// default), so callers that forget to pass it still get the full cluster.
{
	const actions = homeActionDescriptors();
	assert.equal(actions.length, 2, "default treats date jump as enabled");
}

console.log("home-actions.test.mjs: ok");
