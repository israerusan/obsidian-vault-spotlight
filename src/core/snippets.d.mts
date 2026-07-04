export interface Snippet {
	id: string;
	name: string;
	body: string;
}

export const MAX_SNIPPETS: number;

export function normalizeSnippets(raw: unknown): Snippet[];
export function createSnippet(name: string, body: string): Snippet;
export function expandSnippet(
	body: string,
	ctx?: { date?: string; time?: string; clipboard?: string; selection?: string }
): { text: string; cursorOffset: number };
