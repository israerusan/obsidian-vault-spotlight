export function getModifierLabel(platform?: string): string;

export function describeCaptureTarget(args: {
	hasText: boolean;
	targetLabel: string;
	mode?: "append" | "prepend";
	heading?: string;
}): string;

export function getAvailableModeOrder(args?: { isPro?: boolean }): Array<
	"files" | "content" | "headings" | "symbols" | "commands" | "links" | "editors" | "folders" | "capture" | "snippets"
>;

export function cycleMode(
	currentMode: "files" | "content" | "headings" | "symbols" | "commands" | "links" | "editors" | "folders" | "capture" | "snippets",
	args?: { isPro?: boolean; direction?: number }
): "files" | "content" | "headings" | "symbols" | "commands" | "links" | "editors" | "folders" | "capture" | "snippets";

export function getDrillPrefixMatch(
	rawQuery: string,
	prefixes: { symbols?: string; links?: string }
): { mode: "symbols" | "links" | null; pending: boolean };

export function getShortcutHints(args: {
	// The real ResultItem['kind'] set (all singular). The declared list had drifted
	// to also include plural mode names (symbols/commands/links/…) that the impl
	// never receives; those are removed here so the type matches runtime.
	itemKind?:
		| "file"
		| "content"
		| "heading"
		| "command"
		| "symbol"
		| "editor"
		| "folder"
		| "history"
		| "collection"
		| "profile"
		| "workflow"
		| "action"
		| "create"
		| "calc"
		| "datejump"
		| "capture"
		| "snippet"
		| "quickaction"
		| null;
	defaultNewTab?: boolean;
	isPro?: boolean;
	modifierLabel?: string;
}): Array<{ keys: string[]; label: string }>;

export function getPreviewFocusText(item: {
	kind: string;
	snippet?: string;
	heading?: string;
	text?: string;
} | null | undefined): string;

export function getModePlaceholder(
	mode: "files" | "content" | "headings" | "symbols" | "commands" | "links" | "editors" | "folders" | "capture" | "snippets"
): string;

export interface HelpEntry {
	keys: string[];
	label: string;
	proOnly?: boolean;
}

export interface HelpSection {
	title: string;
	entries: HelpEntry[];
}

export function getHelpSections(args?: {
	isPro?: boolean;
	prefixes?: Record<string, string>;
	modifierLabel?: string;
	escapeChar?: string;
}): HelpSection[];

