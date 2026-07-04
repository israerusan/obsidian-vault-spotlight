export function describeCaptureTarget(args: {
	hasText: boolean;
	targetLabel: string;
	mode?: "append" | "prepend";
	heading?: string;
}): string;

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
}): Array<{ keys: string[]; label: string }>;
