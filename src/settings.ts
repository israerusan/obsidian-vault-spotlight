import { App, PluginSettingTab, Setting } from "obsidian";
import type VaultSpotlightPlugin from "./main";
import { LicenseManager } from "./license/LicenseManager";

export interface CustomSearch {
	id: string;
	name: string;
	query: string;
}

export interface VaultSpotlightSettings {
	licenseKey: string;
	isPro: boolean;
	licenseEmail: string;
	recentPaths: string[];
	maxRecent: number;
	customSearches: CustomSearch[];
	showModifiedTime: boolean;
}

export const DEFAULT_SETTINGS: VaultSpotlightSettings = {
	licenseKey: "",
	isPro: false,
	licenseEmail: "",
	recentPaths: [],
	maxRecent: 30,
	customSearches: [],
	showModifiedTime: true,
};

export class VaultSpotlightSettingTab extends PluginSettingTab {
	plugin: VaultSpotlightPlugin;

	constructor(app: App, plugin: VaultSpotlightPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Vault Spotlight" });

		new Setting(containerEl)
			.setName("License key")
			.setDesc("Enter your Pro license key. Verified offline — no account or server required.")
			.addText((text) =>
				text
					.setPlaceholder("payload.signature")
					.setValue(this.plugin.settings.licenseKey)
					.onChange(async (value) => {
						this.plugin.settings.licenseKey = value;
						await this.plugin.refreshLicense();
						this.display();
					})
			);

		const status = containerEl.createDiv({ cls: "vault-spotlight-license-status" });
		if (this.plugin.settings.isPro) {
			status.createEl("p", {
				text: `Pro active${this.plugin.settings.licenseEmail ? ` (${this.plugin.settings.licenseEmail})` : ""}.`,
			});
		} else {
			status.createEl("p", { text: "Free tier active. Upgrade to unlock batch open, content search, and custom commands." });
			const link = status.createEl("a", {
				text: "Get Vault Spotlight Pro ($8)",
				href: "https://iavil.gumroad.com/l/vault-spotlight",
			});
			link.setAttr("target", "_blank");
		}

		new Setting(containerEl)
			.setName("Show modified time")
			.setDesc("Display relative modified time in search results.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showModifiedTime).onChange(async (value) => {
					this.plugin.settings.showModifiedTime = value;
					await this.plugin.saveSettings();
				})
			);

		containerEl.createEl("h3", { text: "Custom searches (Pro)" });
		const customList = containerEl.createDiv();
		if (!this.plugin.settings.isPro) {
			customList.createEl("p", { text: "Unlock Pro to save custom search commands." });
		} else if (this.plugin.settings.customSearches.length === 0) {
			customList.createEl("p", { text: "No custom searches yet. Create one from the spotlight with Ctrl+S." });
		} else {
			for (const search of this.plugin.settings.customSearches) {
				customList.createEl("p", { text: `${search.name}: ${search.query}` });
			}
		}
	}
}