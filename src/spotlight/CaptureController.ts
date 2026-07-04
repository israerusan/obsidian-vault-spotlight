import { App, MarkdownView, Notice, TFile, moment, normalizePath } from "obsidian";
import type VaultSpotlightPlugin from "../main";
import { fillDailyTemplate } from "../core/dailyTemplate.mjs";
import { insertCapture } from "../core/capture.mjs";
import { expandSnippet } from "../core/snippets.mjs";
import { copyToClipboard } from "./batchOps";
import type { ResultItem } from "./resultTypes";

/**
 * Same pinned-callable `moment` view the modal uses — keeps `moment(...)` typed
 * under `esModuleInterop` (Obsidian re-exports it as a namespace). We only format.
 */
const formatMoment = moment as unknown as (input?: number) => { format(fmt?: string): string };

/**
 * What the capture / daily-note / calc / snippet execution needs from the modal.
 * Deliberately tiny (the same shape as BatchOpsContext) so these vault-writing side
 * effects stay decoupled from modal rendering and selection state.
 */
export interface CaptureHost {
	app: App;
	plugin: VaultSpotlightPlugin;
	close(): void;
	recordSearch(): void;
}

/**
 * The "delight" execution cluster extracted from SpotlightModal: opening/creating
 * dated daily notes (honoring Daily Notes / Periodic Notes config + templates),
 * quick capture, snippet insertion, and calculator copy/insert. Pure parsing lives
 * in core (fillDailyTemplate, insertCapture, expandSnippet); this owns the Obsidian
 * vault/workspace side effects.
 */
export class CaptureController {
	constructor(private host: CaptureHost) {}

	private get app(): App {
		return this.host.app;
	}

	/** Daily-note folder + moment format + template from core or Periodic Notes. */
	dailyNoteConfig(): { folder: string; format: string; template: string } {
		const internal = (
			this.app as unknown as {
				internalPlugins?: {
					getPluginById?: (
						id: string
					) => { instance?: { options?: { folder?: string; format?: string; template?: string } } } | null;
				};
			}
		).internalPlugins;
		const opts = internal?.getPluginById?.("daily-notes")?.instance?.options;
		if (opts && (opts.format || opts.folder !== undefined)) {
			return {
				folder: (opts.folder ?? "").trim(),
				format: (opts.format || "YYYY-MM-DD").trim(),
				template: (opts.template ?? "").trim(),
			};
		}
		const periodic = (
			this.app as unknown as {
				plugins?: { plugins?: Record<string, { settings?: { daily?: { folder?: string; format?: string; template?: string } } }> };
			}
		).plugins?.plugins?.["periodic-notes"];
		const pd = periodic?.settings?.daily;
		if (pd && (pd.format || pd.folder)) {
			return {
				folder: (pd.folder ?? "").trim(),
				format: (pd.format || "YYYY-MM-DD").trim(),
				template: (pd.template ?? "").trim(),
			};
		}
		return { folder: "", format: "YYYY-MM-DD", template: "" };
	}

	resolveDatePath(ms: number): { path: string; exists: boolean } {
		const { folder, format } = this.dailyNoteConfig();
		const name = formatMoment(ms).format(format);
		const path = normalizePath(folder ? `${folder}/${name}.md` : `${name}.md`);
		const exists = this.app.vault.getAbstractFileByPath(path) instanceof TFile;
		return { path, exists };
	}

	/**
	 * Build the initial content for a NEW daily note by expanding the user's
	 * configured Daily Notes / Periodic Notes template. Returns "" when no template
	 * is configured or the file can't be read, so creation still works everywhere.
	 */
	private async dailyTemplateContent(ms: number): Promise<string> {
		const { format, template } = this.dailyNoteConfig();
		if (!template) return "";
		const rel = template.endsWith(".md") ? template : `${template}.md`;
		const file = this.app.vault.getAbstractFileByPath(normalizePath(rel));
		if (!(file instanceof TFile)) return "";
		let raw: string;
		try {
			raw = await this.app.vault.cachedRead(file);
		} catch {
			return "";
		}
		const when = formatMoment(ms);
		const title = when.format(format);
		return fillDailyTemplate(raw, (kind, fmt) => {
			if (kind === "title") return title;
			if (kind === "time") return when.format(fmt || "HH:mm");
			return when.format(fmt || "YYYY-MM-DD");
		});
	}

	/** Create the parent folder chain for `filePath` if it doesn't exist yet. */
	private async ensureFolder(filePath: string): Promise<void> {
		const slash = filePath.lastIndexOf("/");
		if (slash === -1) return;
		const dir = filePath.slice(0, slash);
		if (!dir || this.app.vault.getAbstractFileByPath(dir)) return;
		try {
			await this.app.vault.createFolder(dir);
		} catch {
			// Already created by a concurrent op — safe to ignore.
		}
	}

	async openOrCreateDatedNote(ms: number): Promise<void> {
		const { path } = this.resolveDatePath(ms);
		try {
			let file = this.app.vault.getAbstractFileByPath(path);
			if (!(file instanceof TFile)) {
				await this.ensureFolder(path);
				file = await this.app.vault.create(path, await this.dailyTemplateContent(ms));
			}
			if (file instanceof TFile) {
				await this.app.workspace.getLeaf(false).openFile(file);
				this.host.plugin.trackRecent(file.path);
			}
		} catch (err) {
			console.error("[VaultSpotlight] open daily note failed", err);
			new Notice("Vault Spotlight: could not open the daily note.");
		}
	}

	async runCapture(item: Extract<ResultItem, { kind: "capture" }>): Promise<void> {
		const text = item.text.trim();
		if (!text) {
			new Notice("Vault Spotlight: type something to capture.");
			return;
		}
		const settings = this.host.plugin.settings;
		const now = Date.now();
		const path =
			item.target === "inbox"
				? normalizePath(settings.captureInboxPath.trim())
				: this.resolveDatePath(now).path;
		if (!path) {
			new Notice("Vault Spotlight: no capture target configured.");
			return;
		}
		this.host.recordSearch();
		this.host.close();
		try {
			await this.ensureFolder(path);
			let file = this.app.vault.getAbstractFileByPath(path);
			// A brand-new daily note gets the configured daily template so a capture
			// doesn't land in a blank file where a templated note was expected.
			const initial = item.target === "daily" ? await this.dailyTemplateContent(now) : "";
			if (!(file instanceof TFile)) file = await this.app.vault.create(path, initial);
			if (file instanceof TFile) {
				const existing = await this.app.vault.read(file);
				const updated = insertCapture(existing, text, {
					mode: settings.isPro ? settings.captureMode : "append",
					heading: settings.isPro ? settings.captureHeading : "",
				});
				await this.app.vault.modify(file, updated);
				new Notice(`Vault Spotlight: captured to ${file.basename}.`);
			}
		} catch (err) {
			console.error("[VaultSpotlight] capture failed", err);
			new Notice("Vault Spotlight: capture failed.");
		}
	}

	async insertSnippet(item: Extract<ResultItem, { kind: "snippet" }>): Promise<void> {
		const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor ?? null;
		const selection = editor?.getSelection() ?? "";
		let clipboard = "";
		if (item.body.includes("{{clipboard}}")) {
			try {
				clipboard = await navigator.clipboard.readText();
			} catch {
				clipboard = "";
			}
		}
		const { text, cursorOffset } = expandSnippet(item.body, {
			date: formatMoment().format("YYYY-MM-DD"),
			time: formatMoment().format("HH:mm"),
			clipboard,
			selection,
		});
		this.host.close();
		if (editor) {
			const from = editor.getCursor("from");
			editor.replaceSelection(text);
			const caret = editor.offsetToPos(editor.posToOffset(from) + cursorOffset);
			editor.setCursor(caret);
			editor.focus();
		} else {
			void copyToClipboard(text, "Snippet copied");
		}
	}

	copyCalcResult(item: Extract<ResultItem, { kind: "calc" }>): void {
		void copyToClipboard(item.result, `Copied ${item.result}`);
		this.host.close();
	}

	insertCalcResult(item: Extract<ResultItem, { kind: "calc" }>): void {
		const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
		if (!editor) {
			this.copyCalcResult(item);
			return;
		}
		this.host.close();
		editor.replaceSelection(item.result);
		editor.focus();
	}
}
