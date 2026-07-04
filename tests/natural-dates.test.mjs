import assert from "assert";
import { parseNaturalDate, labelForDate } from "../src/core/naturalDates.mjs";

// Anchor "now" to a fixed local day so results are deterministic.
const NOW = new Date(2026, 6, 3, 15, 30, 0).getTime(); // Fri Jul 3 2026, 15:30 local
const startOfDay = (ms) => {
	const d = new Date(ms);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
};
const TODAY = startOfDay(NOW);
const DAY = 86400000;
const parse = (s) => parseNaturalDate(s, { now: NOW });

// --- Relative days ----------------------------------------------------------
assert.equal(parse("today").date, TODAY, "today");
assert.equal(parse("tomorrow").date, TODAY + DAY, "tomorrow");
assert.equal(parse("tmr").date, TODAY + DAY, "tmr shorthand");
assert.equal(parse("yesterday").date, TODAY - DAY, "yesterday");
assert.equal(parse("today").kind, "relative", "today kind");

// --- Shorthand and in/ago ---------------------------------------------------
assert.equal(parse("+3d").date, TODAY + 3 * DAY, "+3d");
assert.equal(parse("-2d").date, TODAY - 2 * DAY, "-2d");
assert.equal(parse("@1w").date, TODAY + 7 * DAY, "@1w");
assert.equal(parse("in 3 days").date, TODAY + 3 * DAY, "in 3 days");
assert.equal(parse("in 2 weeks").date, TODAY + 14 * DAY, "in 2 weeks");
assert.equal(parse("5 days ago").date, TODAY - 5 * DAY, "5 days ago");
assert.equal(parse("next week").date, TODAY + 7 * DAY, "next week");
assert.equal(parse("last week").date, TODAY - 7 * DAY, "last week");

// --- Months (clamped) -------------------------------------------------------
const inOneMonth = new Date(2026, 7, 3).getTime(); // Aug 3 2026
assert.equal(parse("in 1 month").date, startOfDay(inOneMonth), "in 1 month");
const janEnd = new Date(2026, 0, 31, 12).getTime();
const feb = parseNaturalDate("in 1 month", { now: janEnd });
assert.equal(new Date(feb.date).getMonth(), 1, "Jan 31 + 1 month clamps into February");

// --- Weekdays (anchor is a Friday) ------------------------------------------
const anchorDow = new Date(TODAY).getDay();
const anchorName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][anchorDow];
assert.equal(parse(anchorName).date, TODAY, "bare weekday matching today resolves to today");
assert.equal(parse(`next ${anchorName}`).date, TODAY + 7 * DAY, "next <today's weekday> is +7");
assert.equal(parse(`last ${anchorName}`).date, TODAY - 7 * DAY, "last <today's weekday> is -7");
// A different weekday resolves to the coming occurrence within 7 days.
const wed = parse("wednesday");
assert.ok(wed && wed.date > TODAY && wed.date <= TODAY + 7 * DAY, "wednesday is within the coming week");
assert.equal(parse("wednesday").kind, "weekday", "full weekday name resolves");
// Bare 3-letter abbreviations collide with searches — they must NOT resolve to a
// date unless a modifier is present.
assert.equal(parse("sat"), null, "bare weekday abbreviation is not a date");
assert.equal(parse("mon"), null, "bare 'mon' is not a date");
assert.ok(parse("next sat") && parse("next sat").kind === "weekday", "modifier unlocks the abbreviation");
assert.equal(parse("tom"), null, "'tom' is not tomorrow (collides with the name Tom)");
assert.equal(parse("tod"), null, "'tod' is not today");
// Prototype keys must not leak through the abbreviation lookup: "constructor"
// etc. would otherwise resolve an inherited Object.prototype member and build an
// Invalid Date (NaN) from "next constructor".
assert.equal(parse("next constructor"), null, "prototype key is not a weekday");
assert.equal(parse("this hasOwnProperty"), null, "prototype method is not a weekday");
assert.equal(parse("next tostring"), null, "prototype key (lowercased) is not a weekday");

// --- ISO --------------------------------------------------------------------
assert.equal(parse("2026-07-24").date, new Date(2026, 6, 24).getTime(), "ISO date");
assert.equal(parse("2026/12/25").date, new Date(2026, 11, 25).getTime(), "slash ISO date");
assert.equal(parse("2026-13-01"), null, "invalid month rejected");

// --- Non-dates return null (search must not be hijacked) --------------------
assert.equal(parse("today meeting"), null, "trailing words disqualify");
assert.equal(parse("roadmap"), null, "plain word is not a date");
assert.equal(parse(""), null, "empty is null");
assert.equal(parse("123"), null, "a bare number is not a date");

// --- Label ------------------------------------------------------------------
assert.equal(labelForDate(new Date(2026, 6, 24)), "Fri, Jul 24 2026", "label format");

console.log("natural-dates tests passed");
