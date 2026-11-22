export function buildPreviewExcerpt(
	content: string,
	args?: { focusText?: string; terms?: string[]; maxChars?: number; contextChars?: number }
): string;

export function buildSnippetWindow(line: string, tokens: string[], args?: { width?: number; lead?: number }): string;
