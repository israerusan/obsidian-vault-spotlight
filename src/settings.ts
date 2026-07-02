import { App, PluginSettingTab, Setting } from "obsidian";
import type VaultSpotlightPlugin from "./main";
import { createProfileFromSettings } from "./core/searchProfiles.mjs";
import {
	DEFAULT_ESCAPE_CHAR,
	DEFAULT_MODE_PREFIXES,
	normalizeEscapeChar,
	normalizeModePrefixes,
} from "./core/modeTriggers.mjs";

export type ModePrefixes = Record<
	"content" | "commands" | "headings" | "symbols" | "links" | "editors" | "folders",
	string
>;

export interface CustomSearch {
	id: string;
	name: string;
	query: string;
}

export interface SearchProfile {
	id: string;
	name: string;
	defaultMode: "files" | "content" | "headings" | "symbols" | "commands" | "links" | "editors" | "folders";
	defaultQuery: string;
	includeCanvas: boolean;
	includePdf: boolean;
	includeBases: boolean;
	excludeFolders: string[];
	showPreview: boolean;
}

export interface FrecencyEntry {
	count: number;
	last: number;
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
	pinnedCustomSearchIds: string[];
	searchProfiles: SearchProfile[];
	activeProfileId: string;
	searchAliases: string;
	showModifiedTime: boolean;
	ripgrepCommand: string;
	includeCanvas: boolean;
	includePdf: boolean;
	includeBases: boolean;
	excludeFolders: string[];
	fileFrecency: Record<string, FrecencyEntry>;
	useFrecency: boolean;
	showPreview: boolean;
	recentSearches: string[];
	modePrefixes: ModePrefixes;
	escapeChar: string;
	defaultNewTab: boolean;
	recentCommandIds: string[];
}

export const MAX_CUSTOM_SEARCHES = 50;
export const MAX_RECENT_SEARCHES = 15;

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
	pinnedCustomSearchIds: [],
	searchProfiles: [],
	activeProfileId: "",
	searchAliases: "",
	showModifiedTime: true,
	ripgrepCommand: "rg",
	includeCanvas: true,
	includePdf: true,
	includeBases: true,
	excludeFolders: [],
	fileFrecency: {},
	useFrecency: true,
	showPreview: false,
	recentSearches: [],
	modePrefixes: { ...DEFAULT_MODE_PREFIXES },
	escapeChar: DEFAULT_ESCAPE_CHAR,
	defaultNewTab: false,
	recentCommandIds: [],
};

export const MAX_RECENT_COMMANDS = 25;

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
						// Re-verify on each keystroke (cheap, offline) but only rebuild
						// the whole tab when Pro status actually flips — otherwise
						// display()'s containerEl.empty() destroys the input mid-type.
						// persistUnchanged: the key text changed, so it must be saved
						// even when the Pro status didn't flip.
						void this.plugin.refreshLicense(true).then((changed) => {
							if (changed) this.display();
						});
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

		new Setting(containerEl)
			.setName("Smart ranking (frecency)")
			.setDesc("Rank browse/recent results by how often and how recently you open each note.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.useFrecency).onChange((value) => {
					this.plugin.settings.useFrecency = value;
					void this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Excluded folders")
			.setDesc("One folder path per line (e.g. templates, archive/old). Files inside are hidden from all search modes.")
			.addTextArea((area) => {
				area.setPlaceholder("templates\narchive/old");
				area.setValue(this.plugin.settings.excludeFolders.join("\n"));
				area.inputEl.rows = 4;
				area.onChange((value) => {
					this.plugin.settings.excludeFolders = value
						.split("\n")
						.map((line) => line.trim())
						.filter((line) => line.length > 0);
					void this.plugin.saveSettings();
				});
			});

		new Setting(containerEl).setName("Opening & mode triggers").setHeading();

		new Setting(containerEl)
			.setName("Open in new tab by default")
			.setDesc("Enter opens results in a new tab. Ctrl+Enter then opens in the current tab instead.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.defaultNewTab).onChange((value) => {
					this.plugin.settings.defaultNewTab = value;
					void this.plugin.saveSettings();
				})
			);

		const prefixLabels: Array<{ key: keyof ModePrefixes; name: string; desc: string }> = [
			{ key: "content", name: "Content search trigger", desc: "Search inside note bodies (Pro)." },
			{ key: "commands", name: "Command trigger", desc: "Search and run commands." },
			{ key: "headings", name: "Headings trigger", desc: "Jump to headings across the vault (Pro)." },
			{ key: "symbols", name: "Symbols trigger", desc: "Outline of the active note: headings, links, tags, blocks." },
			{ key: "links", name: "Links trigger", desc: "Backlinks and outlinks (Pro)." },
			{ key: "editors", name: "Open editors trigger", desc: "Jump between open tabs and panes." },
			{ key: "folders", name: "Folders trigger", desc: "Find a folder and browse its files." },
		];
		for (const { key, name, desc } of prefixLabels) {
			new Setting(containerEl)
				.setName(name)
				.setDesc(`${desc} Default: ${DEFAULT_MODE_PREFIXES[key]}`)
				.addText((text) => {
					text.inputEl.maxLength = 4;
					text.inputEl.addClass("vault-spotlight-prefix-input");
					text.setValue(this.plugin.settings.modePrefixes[key]).onChange((value) => {
						this.plugin.settings.modePrefixes = normalizeModePrefixes({
							...this.plugin.settings.modePrefixes,
							[key]: value,
						});
						void this.plugin.saveSettings();
					});
				});
		}

		new Setting(containerEl)
			.setName("Escape character")
			.setDesc(`Start a query with this character to search trigger characters literally. Default: ${DEFAULT_ESCAPE_CHAR}`)
			.addText((text) => {
				text.inputEl.maxLength = 1;
				text.inputEl.addClass("vault-spotlight-prefix-input");
				text.setValue(this.plugin.settings.escapeChar).onChange((value) => {
					this.plugin.settings.escapeChar = normalizeEscapeChar(value);
					void this.plugin.saveSettings();
				});
			});

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
			"Faster content search when ripgrep (rg) is installed. Leave as rg — common install locations (winget, scoop, chocolatey, Homebrew, VS Code's bundled rg) are auto-detected when it isn't on your PATH.",
			(setting) => {
				setting.addText((text) =>
					text
						.setPlaceholder("rg")
						.setValue(this.plugin.settings.ripgrepCommand)
						.onChange((value) => {
							this.plugin.settings.ripgrepCommand = value.trim() || "rg";
							this.plugin.contentSearcher.setRipgrepCommand(this.plugin.settings.ripgrepCommand);
							void this.plugin.saveSettings();
						})
				);
			}
		);

		proSearch("Include Canvas files", "Search .canvas files by name and search text inside canvas nodes.", (setting) => {
			setting.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.includeCanvas).onChange((value) => {
					this.plugin.settings.includeCanvas = value;
					void this.plugin.saveSettings();
				})
			);
		});

		proSearch("Include PDF files", "Show PDFs in file search (filename). PDF body text search is not supported.", (setting) => {
			setting.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.includePdf).onChange((value) => {
					this.plugin.settings.includePdf = value;
					void this.plugin.saveSettings();
				})
			);
		});

		proSearch(
			"Include Base files",
			"Show Bases (.base) in file search and search text inside their view and filter definitions.",
			(setting) => {
				setting.addToggle((toggle) =>
					toggle.setValue(this.plugin.settings.includeBases).onChange((value) => {
						this.plugin.settings.includeBases = value;
						void this.plugin.saveSettings();
					})
				);
			}
		);

		proSearch(
			"Preview pane",
			"Show a live preview of the highlighted note beside the results.",
			(setting) => {
				setting.addToggle((toggle) =>
					toggle.setValue(this.plugin.settings.showPreview).onChange((value) => {
						this.plugin.settings.showPreview = value;
						void this.plugin.saveSettings();
					})
				);
			}
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

		new Setting(containerEl)
			.setName("Search aliases (Pro)")
			.setDesc("One alias per line, e.g. crm = in:Clients @type:client. Aliases expand before search.")
			.addTextArea((area) => {
				area.setPlaceholder("crm = in:Clients @type:client\nwaiting = #waiting");
				area.setValue(this.plugin.settings.searchAliases);
				area.inputEl.rows = 4;
				area.onChange((value) => {
					this.plugin.settings.searchAliases = value;
					void this.plugin.saveSettings();
				});
			});

		new Setting(containerEl).setName("Search profiles (Pro)").setHeading();
		const profileList = containerEl.createDiv();
		if (!this.plugin.settings.isPro) {
			profileList.createEl("p", { text: "Unlock Pro to save workspace-style search profiles." });
		} else {
			new Setting(profileList)
				.setName("Save current settings as profile")
				.setDesc("Profiles remember file type toggles, excluded folders, preview preference, and a default query/mode.")
				.addButton((button) =>
					button.setButtonText("Add profile").onClick(() => {
						const profile = createProfileFromSettings(`Profile ${this.plugin.settings.searchProfiles.length + 1}`, this.plugin.settings);
						this.plugin.settings.searchProfiles = [...this.plugin.settings.searchProfiles, profile].slice(0, 20);
						void this.plugin.saveSettings().then(() => this.display());
					})
				);
			if (this.plugin.settings.searchProfiles.length === 0) {
				profileList.createEl("p", { text: "No search profiles yet. Add one here or save one from the action palette." });
			} else {
				for (const profile of this.plugin.settings.searchProfiles) {
					const row = profileList.createDiv({ cls: "vault-spotlight-starred-row" });
					const active = profile.id === this.plugin.settings.activeProfileId;
					row.createSpan({ text: `${active ? "✓ " : ""}${profile.name}: ${profile.defaultMode}${profile.defaultQuery ? ` · ${profile.defaultQuery}` : ""}` });
					const activate = row.createEl("button", { text: active ? "Active" : "Activate" });
					activate.disabled = active;
					activate.addEventListener("click", () => {
						this.plugin.settings.activeProfileId = profile.id;
						void this.plugin.saveSettings().then(() => this.display());
					});
					const remove = row.createEl("button", { text: "Remove" });
					remove.addEventListener("click", () => {
						this.plugin.settings.searchProfiles = this.plugin.settings.searchProfiles.filter((p) => p.id !== profile.id);
						if (this.plugin.settings.activeProfileId === profile.id) this.plugin.settings.activeProfileId = "";
						void this.plugin.saveSettings().then(() => this.display());
					});
				}
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
				const row = customList.createDiv({ cls: "vault-spotlight-starred-row" });
				const pinned = this.plugin.settings.pinnedCustomSearchIds.includes(search.id);
				row.createSpan({ text: `${pinned ? "★ " : ""}${search.name}: ${search.query}` });
				const pinBtn = row.createEl("button", { text: pinned ? "Unpin" : "Pin" });
				pinBtn.addEventListener("click", () => {
					this.plugin.togglePinnedCollection(search.id);
					this.display();
				});
				const btn = row.createEl("button", { text: "Remove" });
				btn.addEventListener("click", () => {
					this.plugin.deleteCustomSearch(search.id);
					this.display();
				});
			}
		}
	}
}