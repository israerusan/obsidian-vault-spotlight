import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, VaultSpotlightSettingTab, type CustomSearch, type VaultSpotlightSettings } from "./settings";
import { SpotlightModal } from "./spotlight/SpotlightModal";
import { LicenseManager } from "./license/LicenseManager";
import { ContentSearcher } from "./search/ContentSearcher";

export default class VaultSpotlightPlugin extends Plugin {
	settings: VaultSpotlightSettings = DEFAULT_SETTINGS;
	private contentSearcher!: ContentSearcher;

	async onload(): Promise<void> {
		await this.loadSettings();
		await this.refreshLicense();

		this.contentSearcher = new ContentSearcher(this.app);

		this.addRibbonIcon("search", "Vault Spotlight", () => this.openSpotlight());
		this.addCommand({
			id: "open-spotlight",
			name: "Open Vault Spotlight",
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "o" }],
			callback: () => this.openSpotlight(),
		});

		for (const search of this.settings.customSearches) {
			this.registerCustomSearchCommand(search);
		}

		this.registerEvent(
			this.app.vault.on("modify", () => this.contentSearcher.invalidate())
		);
		this.registerEvent(
			this.app.vault.on("create", () => this.contentSearcher.invalidate())
		);
		this.registerEvent(
			this.app.vault.on("delete", () => this.contentSearcher.invalidate())
		);
		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (file) this.trackRecent(file.path);
			})
		);

		this.addSettingTab(new VaultSpotlightSettingTab(this.app, this));
	}

	onunload(): void {}

	openSpotlight(initialQuery = ""): void {
		new SpotlightModal(this.app, this, initialQuery).open();
	}

	registerCustomSearchCommand(search: CustomSearch): void {
		this.addCommand({
			id: `custom-search-${search.id}`,
			name: `Spotlight: ${search.name}`,
			callback: () => this.openSpotlight(search.query),
		});
	}

	trackRecent(path: string): void {
		const recent = this.settings.recentPaths.filter((p) => p !== path);
		recent.unshift(path);
		this.settings.recentPaths = recent.slice(0, this.settings.maxRecent);
		void this.saveSettings();
	}

	async refreshLicense(): Promise<void> {
		if (!this.settings.licenseKey) {
			this.settings.isPro = false;
			this.settings.licenseEmail = "";
			await this.saveSettings();
			return;
		}
		const result = LicenseManager.verify(this.settings.licenseKey);
		this.settings.isPro = result.valid;
		this.settings.licenseEmail = result.email ?? "";
		await this.saveSettings();
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}