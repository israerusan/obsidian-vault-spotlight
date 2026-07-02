import { App, Notice, TFile, normalizePath } from "obsidian";
import type VaultSpotlightPlugin from "../main";
import { PromptModal } from "./PromptModal";
import { itemFile, type ResultItem } from "./resultTypes";
import { addTagToTags, normalizeTag, removeInlineTag, removeTagFromTags } from "../core/frontmatterTags.mjs";
import { collectFileTags } from "../search/metadata";
import { buildMocMarkdown, buildResultMarkdown } from "../core/resultMarkdown.mjs";

/**
 * What the batch/export operations need from the modal. Kept minimal so the
 * file-mutation logic stays decoupled from modal rendering and input state.
 */
export interface BatchOpsContext {
	app: App;
	plugin: VaultSpotlightPlugin;
	/** Items an action applies to: checked results, else the full result list. */
	resultItems(): ResultItem[];
	/** The query to stamp into exported notes. */
	exportQuery(): string;
	close(): void;
	runSearch(): void;
	closeActionPalette(): void;
}

function filesForBatch(ctx: BatchOpsContext): TFile[] {
	return ctx.resultItems().map((item) => itemFile(item)).filter((file): file is TFile => !!file);
}

function markdownFilesForBatch(ctx: BatchOpsContext): TFile[] {
	return filesForBatch(ctx).filter((file) => file.extension === "md");
}

export function resultsAsMarkdown(ctx: BatchOpsContext): string {
	const rows = ctx.resultItems().map((item) => {
		const file = itemFile(item);
		if (!file) return null;
		let suffix = "";
		if (item.kind === "content") suffix = ` — L${item.line}: ${item.snippet}`;
		else if (item.kind === "heading") suffix = ` — ${"#".repeat(item.level)} ${item.heading}`;
		return { link: ctx.app.fileManager.generateMarkdownLink(file, ""), suffix };
	}).filter(Boolean) as Array<{ link: string; suffix?: string }>;
	return buildResultMarkdown(rows);
}

export function copyResultsAsMarkdown(ctx: BatchOpsContext): void {
	const markdown = resultsAsMarkdown(ctx);
	if (!markdown) {
		new Notice("Vault Spotlight: no results to copy.");
		return;
	}
	copyToClipboard(markdown, "Results copied");
}

export async function exportResultsToNote(ctx: BatchOpsContext): Promise<void> {
	const markdown = resultsAsMarkdown(ctx);
	if (!markdown) {
		new Notice("Vault Spotlight: no results to export.");
		return;
	}
	const stamp = new Date().toISOString().slice(0, 16).replace("T", " ").replace(":", "-");
	const note = `# Vault Spotlight search results\n\nQuery: ${ctx.exportQuery() || "Browse"}\n\n${markdown}\n`;
	await createExportNote(ctx, `Search results ${stamp}.md`, note, "results exported");
}

export function batchAddTag(ctx: BatchOpsContext): void {
	const files = markdownFilesForBatch(ctx);
	if (files.length === 0) {
		new Notice("Vault Spotlight: select Markdown notes first.");
		return;
	}
	new PromptModal(ctx.app, {
		title: "Add tag to selected notes",
		initial: "spotlight",
		cta: "Add tag",
		onSubmit: (raw) => {
			const cleaned = normalizeTag(raw);
			if (!cleaned) return;
			// processFrontMatter handles YAML serialization (inline AND
			// block-style tag lists) — never edit frontmatter text by hand.
			void Promise.all(
				files.map(async (file) => {
					const cache = ctx.app.metadataCache.getFileCache(file);
					const existing = cache ? collectFileTags(cache) : new Set<string>();
					// Already tagged (frontmatter or inline) — leave the note untouched.
					if (existing.has(cleaned.toLowerCase())) return;
					await ctx.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
						fm.tags = addTagToTags(fm.tags, cleaned);
					});
				})
			).then(() => new Notice(`Vault Spotlight: tag added to ${files.length} note${files.length === 1 ? "" : "s"}.`));
		},
	}).open();
}

export function batchRemoveTag(ctx: BatchOpsContext): void {
	const files = markdownFilesForBatch(ctx);
	if (files.length === 0) {
		new Notice("Vault Spotlight: select Markdown notes first.");
		return;
	}
	new PromptModal(ctx.app, {
		title: "Remove tag from selected notes",
		initial: "spotlight",
		cta: "Remove tag",
		onSubmit: (raw) => {
			const cleaned = normalizeTag(raw);
			if (!cleaned) return;
			void Promise.all(
				files.map(async (file) => {
					await ctx.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
						const next = removeTagFromTags(fm.tags, cleaned);
						if (next === null) delete fm.tags;
						else fm.tags = next;
					});
					// Inline #tag occurrences in the body are plain text, not
					// frontmatter — strip them with an atomic read-modify-write.
					await ctx.app.vault.process(file, (content) => removeInlineTag(content, cleaned));
				})
			).then(() => new Notice(`Vault Spotlight: tag removed from ${files.length} note${files.length === 1 ? "" : "s"}.`));
		},
	}).open();
}

export function batchSetProperty(ctx: BatchOpsContext): void {
	const files = markdownFilesForBatch(ctx);
	if (files.length === 0) {
		new Notice("Vault Spotlight: select Markdown notes first.");
		return;
	}
	new PromptModal(ctx.app, {
		title: "Set property on selected notes",
		initial: "status=active",
		cta: "Set property",
		onSubmit: (raw) => {
			const sep = raw.indexOf("=");
			if (sep <= 0) {
				new Notice("Vault Spotlight: use key=value.");
				return;
			}
			const key = raw.slice(0, sep).trim();
			const value = raw.slice(sep + 1).trim();
			if (!key) return;
			void Promise.all(
				files.map((file) =>
					ctx.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
						// Reuse an existing key that differs only in case rather
						// than adding a near-duplicate property.
						const existingKey =
							Object.keys(fm).find((k) => k.toLowerCase() === key.toLowerCase()) ?? key;
						fm[existingKey] = value;
					})
				)
			).then(() => new Notice(`Vault Spotlight: property set on ${files.length} note${files.length === 1 ? "" : "s"}.`));
		},
	}).open();
}

export function batchMoveFiles(ctx: BatchOpsContext): void {
	const files = filesForBatch(ctx);
	if (files.length === 0) return;
	new PromptModal(ctx.app, {
		title: "Move selected files to folder",
		initial: "Archive",
		cta: "Move files",
		onSubmit: (raw) => {
			const folder = normalizePath(raw.trim());
			if (!folder) return;
			void (async () => {
				if (!ctx.app.vault.getAbstractFileByPath(folder)) await ctx.app.vault.createFolder(folder);
				for (const file of files) {
					await ctx.app.fileManager.renameFile(file, normalizePath(`${folder}/${file.name}`));
				}
				new Notice(`Vault Spotlight: moved ${files.length} file${files.length === 1 ? "" : "s"}.`);
			})();
		},
	}).open();
}

export function batchSetStarred(ctx: BatchOpsContext, starred: boolean): void {
	const files = filesForBatch(ctx);
	for (const file of files) {
		const isStarred = ctx.plugin.isStarred(file.path);
		if (starred !== isStarred) ctx.plugin.toggleStar(file.path);
	}
	new Notice(`Vault Spotlight: ${starred ? "starred" : "unstarred"} ${files.length} file${files.length === 1 ? "" : "s"}.`);
	ctx.runSearch();
}

export function createMocFromResults(ctx: BatchOpsContext): void {
	const rows = ctx.resultItems().map((item) => {
		const file = itemFile(item);
		if (!file) return null;
		return {
			link: ctx.app.fileManager.generateMarkdownLink(file, ""),
			folder: file.parent?.path || "/",
			snippet: item.kind === "content" ? item.snippet : item.kind === "heading" ? item.heading : "",
		};
	}).filter(Boolean) as Array<{ link: string; folder: string; snippet?: string }>;
	if (rows.length === 0) return;
	const stamp = new Date().toISOString().slice(0, 10);
	const note = buildMocMarkdown(rows, { title: `Vault Spotlight MOC ${stamp}`, groupBy: "folder", includeSnippets: true });
	void createExportNote(ctx, `MOC ${stamp}.md`, note, "MOC created");
}

export function appendLinksToActiveNote(ctx: BatchOpsContext): void {
	const active = ctx.app.workspace.getActiveFile();
	if (!active || active.extension !== "md") {
		new Notice("Vault Spotlight: open a Markdown note first.");
		return;
	}
	const markdown = resultsAsMarkdown(ctx);
	if (!markdown) return;
	void ctx.app.vault.process(active, (content) => `${content.trimEnd()}\n\n${markdown}\n`).then(() => new Notice("Vault Spotlight: links appended."));
}

async function createExportNote(ctx: BatchOpsContext, filename: string, note: string, message: string): Promise<void> {
	const dir = "Vault Spotlight Exports";
	if (!ctx.app.vault.getAbstractFileByPath(dir)) await ctx.app.vault.createFolder(dir);
	let path = normalizePath(`${dir}/${filename}`);
	let counter = 2;
	while (ctx.app.vault.getAbstractFileByPath(path)) {
		path = normalizePath(`${dir}/${filename.replace(/\.md$/, ` ${counter}.md`)}`);
		counter++;
	}
	const file = await ctx.app.vault.create(path, note);
	ctx.close();
	await ctx.app.workspace.getLeaf(false).openFile(file);
	new Notice(`Vault Spotlight: ${message}.`);
}

export function copyToClipboard(text: string, okMessage: string): void {
	const clip = navigator.clipboard;
	if (clip?.writeText) {
		void clip.writeText(text).then(
			() => new Notice(`Vault Spotlight: ${okMessage}`),
			() => new Notice("Vault Spotlight: copy failed")
		);
	} else {
		new Notice("Vault Spotlight: clipboard unavailable");
	}
}

export function renameFile(app: App, file: TFile): void {
	new PromptModal(app, {
		title: "Rename note",
		initial: file.basename,
		cta: "Rename",
		onSubmit: (name) => {
			const cleaned = name.replace(/[\\/:*?"<>|]/g, "").trim();
			if (!cleaned || cleaned === file.basename) return;
			const dir = file.parent?.path ? `${file.parent.path}/` : "";
			const newPath = normalizePath(`${dir}${cleaned}.${file.extension}`);
			void app.fileManager.renameFile(file, newPath).catch((err) => {
				console.error("[VaultSpotlight] rename failed", err);
				new Notice("Vault Spotlight: rename failed (name may already exist).");
			});
		},
	}).open();
}
