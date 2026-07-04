import type { TFile, TFolder, WorkspaceLeaf } from "obsidian";
import type { SymbolType } from "../search/SymbolSearcher";
import type { VaultFileKind } from "../search/vaultFiles";

export type SpotlightMode =
	| "files"
	| "content"
	| "headings"
	| "symbols"
	| "commands"
	| "links"
	| "editors"
	| "folders"
	| "capture"
	| "snippets";

export const MODE_ORDER: SpotlightMode[] = [
	"files",
	"content",
	"headings",
	"symbols",
	"commands",
	"links",
	"editors",
	"folders",
	"capture",
	"snippets",
];

export type ResultItem =
	| {
			kind: "file";
			file: TFile;
			score: number;
			matchIndices: number[];
			modifiedLabel: string;
			fileKind: VaultFileKind;
			primaryMatch: "filename" | "path" | "alias" | "filters" | "browse";
			aliasMatched: boolean;
			tags: string[];
			aliases: string[];
			isRecent: boolean;
			isStarred: boolean;
			isBookmarked: boolean;
	  }
	| {
			kind: "content";
			file: TFile;
			line: number;
			snippet: string;
			score: number;
			engine: "ripgrep" | "vault" | "canvas" | "base";
			/** Char offsets within `snippet` to highlight (the matched query terms). */
			matchIndices: number[];
	  }
	| {
			kind: "heading";
			file: TFile;
			line: number;
			heading: string;
			level: number;
			score: number;
			matchIndices: number[];
	  }
	| {
			kind: "command";
			id: string;
			name: string;
			matchIndices: number[];
			isRecent?: boolean;
	  }
	| {
			kind: "symbol";
			file: TFile;
			line: number;
			text: string;
			symbolType: SymbolType;
			level: number;
			matchIndices: number[];
	  }
	| {
			kind: "editor";
			leaf: WorkspaceLeaf;
			file: TFile | null;
			title: string;
			viewType: string;
			isActive: boolean;
			isPinned: boolean;
			matchIndices: number[];
	  }
	| {
			kind: "folder";
			folder: TFolder;
			matchIndices: number[];
	  }
	| {
			kind: "history";
			query: string;
	  }
	| {
			kind: "collection";
			id: string;
			name: string;
			query: string;
			isPinned: boolean;
	  }
	| {
			kind: "profile";
			id: string;
			name: string;
			defaultMode: SpotlightMode;
			defaultQuery: string;
			isActive: boolean;
	  }
	| {
			kind: "workflow";
			id: string;
			name: string;
			query: string;
			mode: SpotlightMode;
			profileId: string;
			isPinned: boolean;
			isStarter: boolean;
			rankingMode?: "balanced" | "filename" | "recency" | "metadata" | "alias";
	  }
	| {
			kind: "action";
			action: SpotlightAction;
	  }
	| {
			kind: "create";
			name: string;
	  }
	| {
			kind: "calc";
			expression: string;
			result: string;
			detail: string;
	  }
	| {
			kind: "datejump";
			date: number;
			label: string;
			path: string;
			exists: boolean;
	  }
	| {
			kind: "capture";
			text: string;
			target: "daily" | "inbox";
			label: string;
			description: string;
	  }
	| {
			kind: "snippet";
			id: string;
			name: string;
			body: string;
			matchIndices: number[];
	  };

export type SpotlightAction = {
	id: string;
	name: string;
	description: string;
	requiresPro?: boolean;
	run: () => void | Promise<void>;
};

export type PaneTarget = "tab" | "split" | "window" | null;

export function itemFile(item: ResultItem): TFile | null {
	if (item.kind === "file" || item.kind === "content" || item.kind === "heading" || item.kind === "symbol") {
		return item.file;
	}
	if (item.kind === "editor") return item.file;
	return null;
}

export function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}
