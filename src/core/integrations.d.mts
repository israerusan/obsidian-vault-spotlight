export interface SearchIntegrations {
	omnisearch: boolean;
	textExtractor: boolean;
	basesPowerPack: boolean;
}

export function detectSearchIntegrations(
	pluginIds: string[] | null | undefined
): SearchIntegrations;
