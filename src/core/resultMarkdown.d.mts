export interface ResultMarkdownRow {
	link: string;
	prefix?: string;
	suffix?: string;
}

export function buildResultMarkdown(rows: ResultMarkdownRow[]): string;

export interface MocRow {
	link: string;
	folder?: string;
	tags?: string[];
	property?: string;
	snippet?: string;
	suffix?: string;
}

export interface MocOptions {
	title?: string;
	groupBy?: "none" | "folder" | "tag" | "property";
	includeSnippets?: boolean;
}

export function buildMocMarkdown(rows: MocRow[], options?: MocOptions): string;
