import assert from "assert";
import { coerceOpenCount, nextOpenCount, showOnboarding, ONBOARDING_MAX_OPENS, OPEN_COUNT_CAP } from "../src/core/onboarding.mjs";

// coerceOpenCount: only non-negative integers survive.
assert.equal(coerceOpenCount(3), 3, "valid count kept");
assert.equal(coerceOpenCount(0), 0, "zero kept");
assert.equal(coerceOpenCount(-1), 0, "negative → 0");
assert.equal(coerceOpenCount(2.5), 0, "float → 0");
assert.equal(coerceOpenCount("7"), 0, "string → 0");
assert.equal(coerceOpenCount(undefined), 0, "missing → 0");

// nextOpenCount increments but stops at the cap (so data.json stops churning).
assert.equal(nextOpenCount(0), 1, "increments from 0");
assert.equal(nextOpenCount(OPEN_COUNT_CAP - 1), OPEN_COUNT_CAP, "reaches the cap");
assert.equal(nextOpenCount(OPEN_COUNT_CAP), OPEN_COUNT_CAP, "does not exceed the cap");
assert.equal(nextOpenCount(9999), 9999, "a corrupt-high value stops incrementing (no data.json churn) rather than clamping");

// showOnboarding: on for the first N opens, off after, off when dismissed.
assert.equal(showOnboarding(0), true, "brand-new user sees onboarding");
assert.equal(showOnboarding(ONBOARDING_MAX_OPENS - 1), true, "still on just under the threshold");
assert.equal(showOnboarding(ONBOARDING_MAX_OPENS), false, "off at the threshold");
assert.equal(showOnboarding(0, true), false, "explicit dismiss turns it off");

console.log("onboarding tests passed");
