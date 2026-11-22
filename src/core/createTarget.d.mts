export function resolveCreateTarget(
	parsed: { folderIncludes: string[]; textTokensRaw: string[] },
	listFolderPaths: () => Iterable<string>
): { folder: string | null; name: string };

export function normalizeFolder(path: string | null | undefined): string;
