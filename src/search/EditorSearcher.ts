import { App, TFile, WorkspaceLeaf } from "obsidian";
import { fuzzyMatch } from "./fuzzy";

export interface EditorResult {
	leaf: WorkspaceLeaf;
	file: TFile | null;
	title: string;
	viewType: string;
	isActive: boolean;
	isPinned: boolean;
	score: number;
	matchIndices: number[];
}

/** View types that never represent a user document (sidebars, explorers, …). */
const IGNORED_VIEW_TYPES = new Set([
	"file-explorer",
	"search",
	"tag",
	"bookmarks",
	"outline",
	"backlink",
	"outgoing-link",
	"all-properties",
	"file-properties",
	"sync",
	"empty",
]);

/**
 * Lists open editors (tabs/panes) ordered most-recently-used first, with the
 * active leaf on top and pinned leaves ahead of unpinned ones — mirroring how
 * users think about "my open tabs".
 */
export class EditorSearcher {
	constructor(private app: App) {}

	openFilePaths(): Set<string> {
		const paths = new Set<string>();
		this.app.workspace.iterateAllLeaves((leaf) => {
			const file = this.leafFile(leaf);
			if (file) paths.add(file.path);
		});
		return paths;
	}

	search(query: string, limit = 60, ignoreDiacritics = false): EditorResult[] {
		const q = query.trim();
		const activeLeaf = this.app.workspace.getMostRecentLeaf();
		const rows: Array<EditorResult & { mru: number }> = [];

		this.app.workspace.iterateAllLeaves((leaf) => {
			const viewType = leaf.view?.getViewType?.() ?? "";
			if (IGNORED_VIEW_TYPES.has(viewType)) return;
			const file = this.leafFile(leaf);
			const title = file ? file.basename : leaf.getDisplayText();
			if (!title) return;

			let score = 1;
			let matchIndices: number[] = [];
			if (q.length > 0) {
				const titleMatch = fuzzyMatch(q, title, { ignoreDiacritics });
				const match = titleMatch ?? (file ? fuzzyMatch(q, file.path, { ignoreDiacritics }) : null);
				if (!match) return;
				score = match.score;
				// Path-only matches get no indices — they'd point into the path,
				// not the rendered title.
				matchIndices = titleMatch ? match.indices : [];
			}

			const extras = leaf as unknown as { activeTime?: number; pinned?: boolean };
			rows.push({
				leaf,
				file,
				title,
				viewType,
				isActive: leaf === activeLeaf,
				isPinned: extras.pinned === true,
				score,
				matchIndices,
				mru: typeof extras.activeTime === "number" ? extras.activeTime : 0,
			});
		});

		rows.sort((a, b) => {
			if (q.length > 0) return b.score - a.score || b.mru - a.mru;
			return (
				Number(b.isActive) - Number(a.isActive) ||
				Number(b.isPinned) - Number(a.isPinned) ||
				b.mru - a.mru
			);
		});
		return rows.slice(0, limit).map((row) => ({
			leaf: row.leaf,
			file: row.file,
			title: row.title,
			viewType: row.viewType,
			isActive: row.isActive,
			isPinned: row.isPinned,
			score: row.score,
			matchIndices: row.matchIndices,
		}));
	}

	activate(leaf: WorkspaceLeaf): void {
		this.app.workspace.setActiveLeaf(leaf, { focus: true });
		void this.app.workspace.revealLeaf(leaf);
	}

	private leafFile(leaf: WorkspaceLeaf): TFile | null {
		const file = (leaf.view as unknown as { file?: unknown })?.file;
		return file instanceof TFile ? file : null;
	}
}
