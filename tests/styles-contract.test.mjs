// A structural CONTRACT test for the modal's sizing/scaling design. It is NOT a
// pixel/screenshot test (the harness can't render Obsidian), but it locks the
// invariants the changelog advertises — themeable size variables, font sizes that
// scale with the interface font, and viewport-safe height/width — so a regression
// (a hardcoded width, a literal-px font size, a fixed height that could overflow a
// short screen) fails CI instead of silently shipping.
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");

// 1. Every font-size scales: no `font-size:` is set to a literal number (all go
//    through var()/calc() on the --vs-fz-* ramp or --font-ui-*). The --vs-fz-*
//    definitions themselves are `--vs-fz-…:` custom props, not `font-size:`, so a
//    fallback like `var(--font-ui-small, 13px)` doesn't trip this.
const literalFont = css.match(/font-size:\s*\d/g);
assert.ok(!literalFont, `every font-size must scale via a variable; found literal font-size(s): ${literalFont}`);

// 2. Modal width is themeable in BOTH normal and preview mode (the reported bug was
//    preview mode hardcoding a width and ignoring the variable).
assert.ok(/width:\s*var\(--vs-modal-width/.test(css), "normal-mode modal width must use --vs-modal-width");
assert.ok(
	/has-preview[^{]*\{[^}]*var\(--vs-modal-preview-width/.test(css),
	"preview-mode width must use --vs-modal-preview-width, not a hardcoded value"
);

// 3. Width never overflows a narrow viewport.
assert.ok(/max-width:\s*calc\(100vw/.test(css), "modal must cap max-width to the viewport");

// 4. Height is themeable AND viewport-safe: both min and max are dvh-capped, so a
//    short screen (mobile landscape) never gets a modal taller than the viewport,
//    and min-height <= max-height holds structurally.
assert.ok(
	/--vs-modal-min-height:[^;]*dvh/.test(css),
	"min-height must be viewport-capped (contain a dvh clamp) so a short screen never overflows"
);
assert.ok(/--vs-modal-max-height:[^;]*dvh/.test(css), "max-height must be viewport-relative (dvh)");
assert.ok(
	/min-height:\s*var\(--vs-modal-min-height/.test(css) && /max-height:\s*var\(--vs-modal-max-height/.test(css),
	"the modal must consume the --vs-modal-min-height / --vs-modal-max-height variables"
);

// 5. Every advertised theming knob is actually defined.
for (const v of [
	"--vs-modal-width",
	"--vs-modal-preview-width",
	"--vs-modal-min-height",
	"--vs-modal-max-height",
	"--vs-fz-badge",
	"--vs-fz-title",
	"--vs-fz-input",
]) {
	assert.ok(css.includes(`${v}:`), `advertised theming variable ${v} must be defined in styles.css`);
}

console.log("styles contract tests passed");
