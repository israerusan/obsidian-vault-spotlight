import { App, TFile } from "obsidian";

export type VaultFileKind = "markdown" | "canvas" | "pdf" | "base";

export function getVaultFileKind(file: TFile): VaultFileKind {
	if (file.extension === "canvas") return "canvas";
	if (file.extension === "pdf") return "pdf";
	if (file.extension === "base") return "base";
	return "markdown";
}

export function normalizeExcludeFolders(folders: string[] | undefined): string[] {
	if (!Array.isArray(folders)) return [];
	return folders
		.map((f) => f.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").toLowerCase())
		.filter((f) => f.length > 0);
}

export function isPathExcluded(path: string, normalizedFolders: string[]): boolean {
	if (normalizedFolders.length === 0) return false;
	const p = path.replace(/\\/g, "/").toLowerCase();
	return normalizedFolders.some((f) => p === f || p.startsWith(`${f}/`));
}

export function getSearchableFiles(
	app: App,
	options: {
		includeCanvas: boolean;
		includePdf: boolean;
		includeBases?: boolean;
		excludeFolders?: string[];
	}
): TFile[] {
	const excluded = normalizeExcludeFolders(options.excludeFolders);
	const files: TFile[] = [];
	for (const file of app.vault.getFiles()) {
		if (isPathExcluded(file.path, excluded)) continue;
		if (file.extension === "md") {
			files.push(file);
		} else if (options.includeCanvas && file.extension === "canvas") {
			files.push(file);
		} else if (options.includePdf && file.extension === "pdf") {
			files.push(file);
		} else if (options.includeBases && file.extension === "base") {
			files.push(file);
		}
	}
	return files;
}

export function iconForFileKind(kind: VaultFileKind): string {
	switch (kind) {
		case "canvas":
			return "layout-dashboard";
		case "pdf":
			return "file-type";
		case "base":
			return "database";
		default:
			return "file-text";
	}
}
