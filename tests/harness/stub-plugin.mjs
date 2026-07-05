// A stand-in for VaultSpotlightPlugin exposing exactly the surface SpotlightModal
// and its controllers touch. Settings start from the REAL DEFAULT_SETTINGS so the
// modal sees a production-shaped config; `overrides` flips things like isPro.
import { DEFAULT_SETTINGS } from "../../src/settings";
import { ContentSearcher } from "../../src/search/ContentSearcher";

export function makeStubPlugin(app, overrides = {}) {
	const settings = { ...structuredClone(DEFAULT_SETTINGS), ...overrides };
	return {
		app,
		settings,
		manifest: { id: "vault-spotlight" },
		contentSearcher: new ContentSearcher(app, settings.ripgrepCommand || "rg"),
		saveCalls: 0,
		saveSettings() {
			this.saveCalls++;
			return Promise.resolve();
		},
		isStarred(path) {
			return settings.starredPaths.includes(path);
		},
		toggleStar(path) {
			if (!settings.isPro) return false;
			const i = settings.starredPaths.indexOf(path);
			if (i >= 0) {
				settings.starredPaths.splice(i, 1);
				return false;
			}
			settings.starredPaths.unshift(path);
			return true;
		},
		onSpotlightClosed() {},
		getBookmarkedPaths() {
			return [];
		},
		trackRecent() {},
		trackCommand() {},
		trackSearch() {},
		togglePinnedCollection() {
			return false;
		},
		registerCustomSearchCommand() {},
		deleteCustomSearch() {},
	};
}
