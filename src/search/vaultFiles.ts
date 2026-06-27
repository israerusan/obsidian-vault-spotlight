import { App, TFile } from "obsidian";

export type VaultFileKind = "markdown" | "canvas" | "pdf";

export function getVaultFileKind(file: TFile): VaultFileKind {
	if (file.extension === "canvas") return "canvas";
	if (file.extension === "pdf") return "pdf";
	return "markdown";
}

export function getSearchableFiles(
	app: App,
	options: { includeCanvas: boolean; includePdf: boolean }
): TFile[] {
	const files: TFile[] = [];
	for (const file of app.vault.getFiles()) {
		if (file.extension === "md") {
			files.push(file);
		} else if (options.includeCanvas && file.extension === "canvas") {
			files.push(file);
		} else if (options.includePdf && file.extension === "pdf") {
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
		default:
			return "file-text";
	}
}