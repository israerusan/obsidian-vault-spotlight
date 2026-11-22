/**
 * Quick-capture text insertion. Pure string transforms so the modal only has to
 * read the file, call one of these, and write it back — and so the section/
 * frontmatter edge cases are unit-tested rather than discovered in a live vault.
 */

// The closing `---` must be a line of its own (end of line or end of file), so
// a "---bar" line isn't mistaken for the closer.
const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;

/** Normalize a heading string ("## Log", "log") to its comparable text. */
function headingText(line) {
	const match = line.match(/^(#{1,6})\s+(.*?)\s*$/);
	return match ? { level: match[1].length, text: match[2].toLowerCase() } : null;
}

/**
 * Mark which lines sit inside a fenced code block (``` or ~~~), so a "# not a
 * heading" line inside a fence is never treated as a Markdown heading.
 */
function fencedLines(lines) {
	const inFence = new Array(lines.length).fill(false);
	let fence = null; // the active fence { ch, len }, or null
	for (let i = 0; i < lines.length; i++) {
		if (fence === null) {
			const open = lines[i].match(/^\s*(`{3,}|~{3,})/);
			if (open) {
				fence = { ch: open[1][0], len: open[1].length };
				inFence[i] = true;
			}
		} else {
			inFence[i] = true;
			// CommonMark: a closing fence is the same character, at least as long as
			// the opener, with nothing but whitespace after it. So a ``` line inside
			// a ```` block is content, not the end of the block.
			const close = lines[i].match(/^\s*(`{3,}|~{3,})\s*$/);
			if (close && close[1][0] === fence.ch && close[1].length >= fence.len) fence = null;
		}
	}
	return inFence;
}

/** Append `text` to the end of `existing`, guaranteeing clean separation. */
function appendToEnd(existing, text) {
	if (existing.trim().length === 0) return `${text}\n`;
	const trimmedEnd = existing.replace(/\s*$/, "");
	return `${trimmedEnd}\n${text}\n`;
}

/** Insert `text` at the top, after a YAML frontmatter block if one exists. */
function prependToTop(existing, text) {
	const fm = existing.match(FRONTMATTER);
	if (fm) {
		// A note that ends right at the closing `---` (no trailing newline) must
		// still get the capture on its own line, or the closer becomes "---text"
		// and the frontmatter stops parsing.
		const head = fm[0].endsWith("\n") ? fm[0] : `${fm[0]}\n`;
		const rest = existing.slice(fm[0].length);
		if (rest.length === 0) return `${head}${text}\n`;
		return `${head}${text}\n${rest.startsWith("\n") ? "" : "\n"}${rest}`;
	}
	return `${text}\n${existing.startsWith("\n") ? "" : "\n"}${existing}`;
}

/**
 * Insert `text` at the end of the section owned by `heading`. When the heading
 * is missing, the capture is appended under a freshly created heading so it is
 * never silently dropped.
 */
function insertUnderHeading(existing, text, heading) {
	const wanted = heading.replace(/^#+\s*/, "").trim().toLowerCase();
	const lines = existing.split("\n");
	const inFence = fencedLines(lines);
	let headingLine = -1;
	let headingLevel = 0;
	for (let i = 0; i < lines.length; i++) {
		if (inFence[i]) continue;
		const h = headingText(lines[i]);
		if (h && h.text === wanted) {
			headingLine = i;
			headingLevel = h.level;
			break;
		}
	}
	if (headingLine === -1) {
		const withHeading = appendToEnd(existing, `## ${heading.replace(/^#+\s*/, "").trim()}`);
		return appendToEnd(withHeading.replace(/\n$/, ""), text);
	}

	// Find the end of the section: the next heading of the same or higher level
	// (ignoring headings that live inside fenced code blocks).
	let end = lines.length;
	for (let i = headingLine + 1; i < lines.length; i++) {
		if (inFence[i]) continue;
		const h = headingText(lines[i]);
		if (h && h.level <= headingLevel) {
			end = i;
			break;
		}
	}
	// Trim trailing blank lines inside the section, then insert.
	let insertAt = end;
	while (insertAt > headingLine + 1 && lines[insertAt - 1].trim() === "") insertAt--;
	lines.splice(insertAt, 0, text);
	return lines.join("\n").replace(/\s*$/, "") + "\n";
}

/**
 * Produce new file content with `text` captured into `existing`.
 *
 * @param {string} existing current file content ("" for a new note)
 * @param {string} text the captured line
 * @param {{ mode?: "append" | "prepend", heading?: string }} [options]
 */
export function insertCapture(existing, text, options = {}) {
	const base = typeof existing === "string" ? existing : "";
	const line = String(text ?? "").trim();
	if (line.length === 0) return base;
	if (options.heading && options.heading.trim().length > 0) {
		return insertUnderHeading(base, line, options.heading);
	}
	return options.mode === "prepend" ? prependToTop(base, line) : appendToEnd(base, line);
}
