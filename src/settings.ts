import { App, PluginSettingTab, Setting } from "obsidian";
import type VaultSpotlightPlugin from "./main";

export interface CustomSearch {
	id: string;
	name: string;
	query: string;
}

export interface VaultSpotlightSettings {
	licenseKey: string;
	isPro: boolean;
	licenseEmail: string;
	purchaseUrl: string;
	recentPaths: string[];
	starredPaths: string[];
	maxRecent: number;
	maxStarred: number;
	customSearches: CustomSearch[];
	showModifiedTime: boolean;
	ripgrepCommand: string;
	includeCanvas: boolean;
	includePdf: boolean;
}

export const DEFAULT_SETTINGS: VaultSpotlightSettings = {
	licenseKey: "",
	isPro: false,
	licenseEmail: "",
	purchaseUrl: "https://buymeacoffee.com/vaultspotlight",
	recentPaths: [],
	starredPaths: [],
	maxRecent: 30,
	maxStarred: 50,
	customSearches: [],
	showModifiedTime: true,
	ripgrepCommand: "rg",
	includeCanvas: true,
	includePdf: true,
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

		new Setting(containerEl)
			.setName("License key")
			.setDesc("Enter your Pro license key. Verified offline — no account or server required.")
			.addText((text) =>
				text
					.setPlaceholder("payload.signature")
					.setValue(this.plugin.settings.licenseKey)
					.onChange((value) => {
						this.plugin.settings.licenseKey = value;
						void this.plugin.refreshLicense().then(() => this.display());
					})
			);

		const status = containerEl.createDiv({ cls: "vault-spotlight-license-status" });
		if (this.plugin.settings.isPro) {
			status.createEl("p", {
				text: `Pro active${this.plugin.settings.licenseEmail ? ` (${this.plugin.settings.licenseEmail})` : ""}.`,
			});
		} else {
			status.createEl("p", { text: "Free tier active. Upgrade to unlock batch open, content search, and saved commands." });
			const link = status.createEl("a", {
				text: "Get Pro on Buy Me a Coffee",
				href: this.plugin.settings.purchaseUrl,
			});
			link.setAttr("target", "_blank");
		}

		new Setting(containerEl)
			.setName("Purchase page URL")
			.setDesc("Link shown for Pro upgrades. Defaults to Buy Me a Coffee.")
			.addText((text) =>
				text
					.setPlaceholder("https://your-store.com/product")
					.setValue(this.plugin.settings.purchaseUrl)
					.onChange((value) => {
						this.plugin.settings.purchaseUrl = value.trim() || DEFAULT_SETTINGS.purchaseUrl;
						void this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Show modified time")
			.setDesc("Display relative modified time in search results.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showModifiedTime).onChange((value) => {
					this.plugin.settings.showModifiedTime = value;
					void this.plugin.saveSettings();
				})
			);

		new Setting(containerEl).setName("Pro search").setHeading();

		const proSearch = (name: string, desc: string, render: (setting: Setting) => void) => {
			const setting = new Setting(containerEl).setName(name).setDesc(desc);
			if (!this.plugin.settings.isPro) {
				setting.settingEl.addClass("vault-spotlight-setting-locked");
				setting.descEl.appendText(" (Pro)");
				return;
			}
			render(setting);
		};

		proSearch(
			"Ripgrep command",
			"Faster content search when ripgrep (rg) is installed. Leave as rg if it's on your PATH.",
			(setting) =>
				setting.addText((text) =>
					text
						.setPlaceholder("rg")
						.setValue(this.plugin.settings.ripgrepCommand)
						.onChange((value) => {
							this.plugin.settings.ripgrepCommand = value.trim() || "rg";
							this.plugin.contentSearcher.setRipgrepCommand(this.plugin.settings.ripgrepCommand);
							void this.plugin.saveSettings();
						})
				)
		);

		proSearch("Include Canvas files", "Search .canvas files by name and search text inside canvas nodes.", (setting) =>
			setting.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.includeCanvas).onChange((value) => {
					this.plugin.settings.includeCanvas = value;
					void this.plugin.saveSettings();
				})
			)
		);

		proSearch("Include PDF files", "Show PDFs in file search (filename). PDF body text search is not supported.", (setting) =>
			setting.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.includePdf).onChange((value) => {
					this.plugin.settings.includePdf = value;
					void this.plugin.saveSettings();
				})
			)
		);

		new Setting(containerEl).setName("Starred files (Pro)").setHeading();
		const starredList = containerEl.createDiv();
		if (!this.plugin.settings.isPro) {
			starredList.createEl("p", { text: "Pin important files with Ctrl+D in the spotlight." });
		} else if (this.plugin.settings.starredPaths.length === 0) {
			starredList.createEl("p", { text: "No starred files yet. Select a result and press Ctrl+D." });
		} else {
			for (const path of this.plugin.settings.starredPaths) {
				const row = starredList.createDiv({ cls: "vault-spotlight-starred-row" });
				row.createSpan({ text: path });
				const btn = row.createEl("button", { text: "Remove" });
				btn.addEventListener("click", () => {
					this.plugin.settings.starredPaths = this.plugin.settings.starredPaths.filter((p) => p !== path);
					void this.plugin.saveSettings().then(() => this.display());
				});
			}
		}

		new Setting(containerEl).setName("Custom searches (Pro)").setHeading();
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