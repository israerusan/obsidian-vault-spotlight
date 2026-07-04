/**
 * Natural-language date parsing for the Spotlight query bar.
 *
 * `parseNaturalDate` recognizes the phrases people actually type ("today",
 * "next friday", "in 3 weeks", "2026-07-24") and resolves them to a local
 * calendar day. The modal turns that day into a daily-note jump/create target.
 * Kept dependency-free and pure so Node tests exercise the real logic; the
 * caller supplies `now` so results are deterministic.
 */

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
// Fallback for abbreviations the prefix match below can't resolve on its own.
const WEEKDAY_ABBR = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(ms) {
	const d = new Date(ms);
	d.setHours(0, 0, 0, 0);
	return d;
}

function addDays(date, n) {
	const d = new Date(date.getTime());
	d.setDate(d.getDate() + n);
	return d;
}

function addMonths(date, n) {
	const d = new Date(date.getTime());
	const targetDay = d.getDate();
	d.setDate(1);
	d.setMonth(d.getMonth() + n);
	// Clamp to the last valid day of the resulting month (Jan 31 + 1mo → Feb 28).
	const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
	d.setDate(Math.min(targetDay, lastDay));
	return d;
}

/** Resolve a weekday name (full or 3+ letter abbreviation) to 0-6, or -1. */
function weekdayIndex(word) {
	const w = word.toLowerCase();
	const full = WEEKDAYS.indexOf(w);
	if (full !== -1) return full;
	for (let i = 0; i < WEEKDAYS.length; i++) {
		if (WEEKDAYS[i].startsWith(w) && w.length >= 3) return i;
	}
	// Own-property lookup only: a bracket access like WEEKDAY_ABBR["constructor"]
	// would otherwise resolve an inherited Object.prototype member (a function),
	// pass the `!== -1` guard, and make "next constructor" build an Invalid Date.
	return Object.prototype.hasOwnProperty.call(WEEKDAY_ABBR, w) ? WEEKDAY_ABBR[w] : -1;
}

/** A human label like "Fri, Jul 24 2026" for the result row. */
export function labelForDate(date) {
	return `${WEEKDAY_SHORT[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
}

const UNIT_DAYS = { day: 1, days: 1, d: 1, week: 7, weeks: 7, w: 7 };

/**
 * Parse a natural-language date phrase. Returns { date, label, kind } or null.
 * Only the whole trimmed input is considered a date — trailing words disqualify
 * it, so "today meeting" stays a file search.
 *
 * @param {string} rawInput
 * @param {{ now?: number, weekStartsOn?: number }} [options]
 */
export function parseNaturalDate(rawInput, options = {}) {
	const input = String(rawInput ?? "").trim().toLowerCase();
	if (input.length === 0 || input.length > 40) return null;

	const now = typeof options.now === "number" ? options.now : Date.now();
	const today = startOfDay(now);

	const build = (date, kind) => ({ date: date.getTime(), label: labelForDate(date), kind });

	// today / tomorrow / yesterday. Deliberately no 3-letter shorthands like
	// "tod"/"tom"/"yd" — those collide with ordinary searches (and names like Tom).
	if (input === "today") return build(today, "relative");
	if (input === "tomorrow" || input === "tmr" || input === "tmrw") return build(addDays(today, 1), "relative");
	if (input === "yesterday") return build(addDays(today, -1), "relative");

	// ISO YYYY-MM-DD (or YYYY/MM/DD)
	const iso = input.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
	if (iso) {
		const y = Number(iso[1]);
		const mo = Number(iso[2]);
		const day = Number(iso[3]);
		if (mo >= 1 && mo <= 12 && day >= 1 && day <= 31) {
			const d = new Date(y, mo - 1, day);
			// Also assert the year: new Date(y, …) remaps 0–99 to 1900+y, so an
			// input like "0050-01-01" would silently resolve to 1950. Reject the
			// wrong-century result rather than jump the user to a bogus daily note.
			if (d.getFullYear() === y && d.getMonth() === mo - 1 && d.getDate() === day) return build(d, "iso");
		}
		return null;
	}

	// +Nd / -Nw / @Nd shorthand
	const shorthand = input.match(/^[@+]?(-?\d{1,4})\s*(d|w)$/);
	if (shorthand) {
		const n = Number(shorthand[1]);
		const days = shorthand[2] === "w" ? n * 7 : n;
		return build(addDays(today, days), "relative");
	}

	// next/last week/month
	if (input === "next week") return build(addDays(today, 7), "relative");
	if (input === "last week") return build(addDays(today, -7), "relative");
	if (input === "next month") return build(addMonths(today, 1), "relative");
	if (input === "last month") return build(addMonths(today, -1), "relative");

	// in N days/weeks   |   N days/weeks ago
	const inMatch = input.match(/^in\s+(\d{1,4})\s+(day|days|week|weeks|month|months)$/);
	if (inMatch) {
		const n = Number(inMatch[1]);
		const unit = inMatch[2];
		if (unit.startsWith("month")) return build(addMonths(today, n), "relative");
		return build(addDays(today, n * UNIT_DAYS[unit]), "relative");
	}
	const agoMatch = input.match(/^(\d{1,4})\s+(day|days|week|weeks|month|months)\s+ago$/);
	if (agoMatch) {
		const n = Number(agoMatch[1]);
		const unit = agoMatch[2];
		if (unit.startsWith("month")) return build(addMonths(today, -n), "relative");
		return build(addDays(today, -n * UNIT_DAYS[unit]), "relative");
	}

	// [next|last|this] <weekday>
	const wdMatch = input.match(/^(next|last|this)?\s*([a-z]+)$/);
	if (wdMatch) {
		const word = wdMatch[2];
		const idx = weekdayIndex(word);
		const modifier = wdMatch[1] ?? "";
		// A bare abbreviation ("sat", "mon") collides with real search terms, so it
		// only resolves to a date with an explicit modifier ("next sat") or as the
		// full weekday name ("saturday").
		if (idx !== -1 && (modifier !== "" || WEEKDAYS.includes(word))) {
			const cur = today.getDay();
			let delta = (idx - cur + 7) % 7; // 0..6 forward to the coming weekday
			if (modifier === "next") {
				delta = delta === 0 ? 7 : delta + 7;
			} else if (modifier === "last") {
				delta = delta === 0 ? -7 : delta - 7;
			} else if (delta === 0) {
				// bare / "this" weekday that equals today → today itself
				delta = 0;
			}
			return build(addDays(today, delta), "weekday");
		}
	}

	return null;
}
