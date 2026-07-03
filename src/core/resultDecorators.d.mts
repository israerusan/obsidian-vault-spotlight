export interface FileDecorationInput {
	parentPath?: string;
	modifiedLabel?: string;
	fileKind?: string;
	isStarred?: boolean;
	isBookmarked?: boolean;
	isRecent?: boolean;
	primaryMatch?: string;
	aliasMatched?: boolean;
	tags?: string[];
	aliases?: string[];
}

export interface FileDecorations {
	badges: string[];
	meta: string;
	reason: string;
}

export function buildFileDecorations(input: FileDecorationInput): FileDecorations;
export function reasonLabel(primaryMatch?: string, aliasMatched?: boolean): string;
