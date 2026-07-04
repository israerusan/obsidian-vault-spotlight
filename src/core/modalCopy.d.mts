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
	itemKind?:
		| "file"
		| "content"
		| "heading"
		| "symbols"
		| "commands"
		| "links"
		| "editors"
		| "folders"
		| "capture"
		| "snippets"
		| "symbol"
		| "command"
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
		| "snippet"
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

