export function findBacklinks<T extends { path: string }>(
	files: T[],
	resolvedLinks: Record<string, Record<string, number>> | null | undefined,
	targetPath: string
): T[];

export function findOutlinks<T extends { path: string }>(
	files: T[],
	resolvedLinks: Record<string, Record<string, number>> | null | undefined,
	sourcePath: string
): T[];

export function findRelatedBySharedTags<T extends { path: string; tags?: string[] }>(
	rows: T[],
	targetPath: string
): T[];
