export function detectSearchIntegrations(pluginIds) {
	const ids = new Set((pluginIds || []).map((id) => String(id).toLowerCase()));
	return {
		omnisearch: ids.has("omnisearch") || ids.has("obsidian-omnisearch"),
		textExtractor: ids.has("text-extractor") || ids.has("obsidian-text-extractor"),
	};
}
