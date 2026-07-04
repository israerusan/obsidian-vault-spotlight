import assert from "assert";
import { fillDailyTemplate } from "../src/core/dailyTemplate.mjs";

// A resolver that mimics the modal's: date/time honor an optional :format, and
// title is the note name. Kept trivial so the token PARSING is what's tested.
const resolve = (kind, fmt) => {
	if (kind === "title") return "2026-07-03";
	if (kind === "date") return fmt === "YYYY" ? "2026" : "2026-07-03";
	if (kind === "time") return fmt === "HH" ? "09" : "09:30";
	return undefined;
};

// Basic token substitution
assert.equal(
	fillDailyTemplate("# {{title}}\n\nCreated {{date}} at {{time}}", resolve),
	"# 2026-07-03\n\nCreated 2026-07-03 at 09:30"
);

// Formatted tokens
assert.equal(fillDailyTemplate("Year {{date:YYYY}} hour {{time:HH}}", resolve), "Year 2026 hour 09");

// Whitespace inside the braces is tolerated
assert.equal(fillDailyTemplate("{{ date }} {{  title  }}", resolve), "2026-07-03 2026-07-03");

// Case-insensitive token names
assert.equal(fillDailyTemplate("{{DATE}} {{Title}}", resolve), "2026-07-03 2026-07-03");

// Unknown tokens are left untouched (never inject "undefined")
assert.equal(fillDailyTemplate("{{foo}} {{title}}", resolve), "{{foo}} 2026-07-03");

// A resolver returning a non-string leaves that token intact
assert.equal(fillDailyTemplate("{{date}}", () => 42), "{{date}}");

// Empty / non-string templates yield an empty string (safe default for create)
assert.equal(fillDailyTemplate("", resolve), "");
assert.equal(fillDailyTemplate(null, resolve), "");
assert.equal(fillDailyTemplate(undefined, resolve), "");

// A missing resolver returns the template verbatim rather than throwing
assert.equal(fillDailyTemplate("{{date}}", null), "{{date}}");

// Repeated tokens are all replaced
assert.equal(fillDailyTemplate("{{title}}-{{title}}", resolve), "2026-07-03-2026-07-03");

console.log("daily-template tests passed");
