export type TriggeredMode =
	| "content"
	| "commands"
	| "headings"
	| "symbols"
	| "links"
	| "editors"
	| "folders"
	| "capture"
	| "snippets";

export type ModePrefixMap = Record<TriggeredMode, string>;

export const DEFAULT_MODE_PREFIXES: ModePrefixMap;
export const DEFAULT_ESCAPE_CHAR: string;

export function normalizeModePrefixes(raw: unknown): ModePrefixMap;
export function normalizeEscapeChar(raw: unknown): string;
export function reconcileEscapeChar(escapeChar: unknown, modePrefixes: Partial<ModePrefixMap> | null | undefined): string;

export function detectModeFromPrefix(
	raw: string,
	prefixes?: ModePrefixMap,
	escapeChar?: string
): { mode: TriggeredMode | null; body: string; escaped: boolean };

export function parseHeadingQuery(raw: string): {
	fileQuery: string;
	headingQuery: string;
	levelMin: number | null;
	levelMax: number | null;
};

export function pushRecentCommand(recentIds: unknown, id: string, max?: number): string[];
export function previousFilePath(recentPaths: unknown, activePath: string): string | null;
