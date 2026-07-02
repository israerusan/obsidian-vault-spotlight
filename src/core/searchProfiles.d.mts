export type ProfileMode =
	| "files"
	| "content"
	| "headings"
	| "symbols"
	| "commands"
	| "links"
	| "editors"
	| "folders";

export interface CoreSearchProfile {
	id: string;
	name: string;
	defaultMode: ProfileMode;
	defaultQuery: string;
	includeCanvas: boolean;
	includePdf: boolean;
	includeBases: boolean;
	excludeFolders: string[];
	showPreview: boolean;
}

export interface ProfileSourceSettings {
	includeCanvas?: boolean;
	includePdf?: boolean;
	includeBases?: boolean;
	excludeFolders?: string[];
	showPreview?: boolean;
}

export const PROFILE_MODES: Set<string>;

export function normalizeProfiles(rawProfiles: unknown): CoreSearchProfile[];
export function activeProfile(
	profiles: CoreSearchProfile[],
	activeProfileId: string
): CoreSearchProfile | null;
export function createProfileFromSettings(
	name: string,
	settings: ProfileSourceSettings | null | undefined,
	mode?: string,
	query?: string
): CoreSearchProfile;
