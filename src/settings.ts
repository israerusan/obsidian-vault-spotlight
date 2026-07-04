import { App, PluginSettingTab, Setting } from "obsidian";
import type VaultSpotlightPlugin from "./main";
import { createProfileFromSettings } from "./core/searchProfiles.mjs";
import { DEFAULT_RANKING_SETTINGS } from "./core/ranking.mjs";
import { ensureStarterWorkflows } from "./core/workflowPresets.mjs";
import { createSnippet, MAX_SNIPPETS } from "./core/snippets.mjs";
import {
	DEFAULT_ESCAPE_CHAR,
	DEFAULT_MODE_PREFIXES,
	normalizeEscapeChar,
	normalizeModePrefixes,
} from "./core/modeTriggers.mjs";
import { getModifierLabel } from "./core/modalCopy.mjs";

/** Returns `url` if it is a well-formed http(s) URL, otherwise `fallback`. */
export function safeHttpUrl(url: string, fallback: string): string {
	try {
		const parsed = new URL(url);
		if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
	} catch {
		// Not a parseable URL — fall through.
	}
	return fallback;
}

export type ModePrefixes = Record<
	"content" | "commands" | "headings" | "symbols" | "links" | "editors" | "folders" | "capture" | "snippets",
	string
>;

export interface CustomSearch {
	id: string;
	name: string;
	query: string;
}

export interface Snippet {
	id: string;
	name: string;
	body: string;
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
	rankingMode?: "balanced" | "filename" | "recency" | "metadata" | "alias";
}

export interface WorkflowPreset {
	id: string;
	name: string;
	query: string;
	mode: SearchProfile["defaultMode"];
	profileId: string;
	pinned: boolean;
	starter?: boolean;
	rankingMode?: SearchProfile["rankingMode"];
}

export interface RankingSettings {
	mode: "balanced" | "filename" | "recency" | "metadata" | "alias";
	preferOpenFiles: boolean;
	preferStarredFiles: boolean;
	preferBookmarkedFiles: boolean;
	preferRecentFiles: boolean;
	ignoreDiacritics: boolean;
	showMatchReasons: boolean;
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
	workflowPresets: WorkflowPreset[];
	searchProfiles: SearchProfile[];
	activeProfileId: string;
	ranking: RankingSettings;
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
	enableCalculator: boolean;
	currencyRates: string;
	enableDateJump: boolean;
	captureInboxPath: string;
	captureMode: "append" | "prepend";
	captureHeading: string;
	snippets: Snippet[];
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
	workflowPresets: [],
	searchProfiles: [],
	activeProfileId: "",
	ranking: { ...DEFAULT_RANKING_SETTINGS },
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
	enableCalculator: true,
	currencyRates: "",
	enableDateJump: true,
	captureInboxPath: "",
	captureMode: "append",
	captureHeading: "",
	snippets: [],
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
		const mod = getModifierLabel(containerEl.ownerDocument?.defaultView?.navigator?.platform ?? window.navigator.platform);
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
				// Only render http(s) URLs — a stored "javascript:" value would
				// otherwise become a clickable script link (self-XSS) in the pane.
				href: safeHttpUrl(this.plugin.settings.purchaseUrl, DEFAULT_SETTINGS.purchaseUrl),
			});
			link.setAttr("target", "_blank");
			link.setAttr("rel", "noopener noreferrer");
		}

		new Setting(containerEl)
			.setName("Purchase page URL")
			.setDesc("Link shown for Pro upgrades. Defaults to Buy Me a Coffee.")
			.addText((text) =>
				text
					.setPlaceholder("https://your-store.com/product")
					.setValue(this.plugin.settings.purchaseUrl)
					.onChange((value) => {
						const trimmed = value.trim();
						this.plugin.settings.purchaseUrl = trimmed
							? safeHttpUrl(trimmed, DEFAULT_SETTINGS.purchaseUrl)
							: DEFAULT_SETTINGS.purchaseUrl;
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

		new Setting(containerEl).setName("Ranking & match reasons").setHeading();

		new Setting(containerEl)
			.setName("Default ranking mode")
			.setDesc("Choose what file search should prioritize when several notes match.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("balanced", "Balanced")
					.addOption("filename", "Filename first")
					.addOption("recency", "Recency first")
					.addOption("metadata", "Metadata first")
					.addOption("alias", "Alias aware")
					.setValue(this.plugin.settings.ranking.mode)
					.onChange((value: RankingSettings["mode"]) => {
						this.plugin.settings.ranking.mode = value;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Prefer open files")
			.setDesc("Boost notes that are already open in an editor.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.ranking.preferOpenFiles).onChange((value) => {
					this.plugin.settings.ranking.preferOpenFiles = value;
					void this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Prefer starred, bookmarked, and recent files")
			.setDesc("Keep pinned work and recently touched notes near the top of browse results.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.ranking.preferStarredFiles && this.plugin.settings.ranking.preferBookmarkedFiles && this.plugin.settings.ranking.preferRecentFiles).onChange((value) => {
					this.plugin.settings.ranking.preferStarredFiles = value;
					this.plugin.settings.ranking.preferBookmarkedFiles = value;
					this.plugin.settings.ranking.preferRecentFiles = value;
					void this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Ignore diacritics")
			.setDesc("Treat café like cafe when matching filenames and aliases.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.ranking.ignoreDiacritics).onChange((value) => {
					this.plugin.settings.ranking.ignoreDiacritics = value;
					void this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Show match reasons")
			.setDesc("Display why a result ranked well, such as Alias match or Starred.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.ranking.showMatchReasons).onChange((value) => {
					this.plugin.settings.ranking.showMatchReasons = value;
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

		new Setting(containerEl).setName("Calculator & dates").setHeading();

		new Setting(containerEl)
			.setName("Inline calculator")
			.setDesc("Type math, unit conversions, or percentages (e.g. 1234*0.19, 10 km to mi, 20% of 250) and press Enter to copy the answer.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enableCalculator).onChange((value) => {
					this.plugin.settings.enableCalculator = value;
					void this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Currency rates")
			.setDesc("One per line as CODE=rate, expressed in units per 1 USD (e.g. EUR=0.92). Used for offline currency conversion — you keep them current.")
			.addTextArea((area) => {
				area.setPlaceholder("USD=1\nEUR=0.92\nGBP=0.79");
				area.setValue(this.plugin.settings.currencyRates);
				area.inputEl.rows = 4;
				area.onChange((value) => {
					this.plugin.settings.currencyRates = value;
					void this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Daily-note date jump")
			.setDesc("Type a date like today, next friday, or in 3 weeks to open (or create) that day's daily note. Honors your Daily Notes / Periodic Notes settings.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enableDateJump).onChange((value) => {
					this.plugin.settings.enableDateJump = value;
					void this.plugin.saveSettings();
				})
			);

		new Setting(containerEl).setName("Opening & mode triggers").setHeading();

		new Setting(containerEl)
			.setName("Open in new tab by default")
			.setDesc(`Enter opens results in a new tab. ${mod}+Enter then opens in the current tab instead.`)
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
			{ key: "capture", name: "Quick capture trigger", desc: "Append a note to your daily note or inbox without opening it." },
			{ key: "snippets", name: "Snippets trigger", desc: "Insert reusable text snippets at the cursor (Pro)." },
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

		new Setting(containerEl).setName("Quick capture").setHeading();
		containerEl.createEl("p", {
			cls: "vault-spotlight-hint-text",
			text: "Type the capture trigger, jot a thought, and press Enter — it appends to today's daily note without opening it. Pro adds an inbox target, prepend, and a target heading.",
		});

		proSearch(
			"Inbox note",
			"Optional second capture target — a vault path like Inbox.md. Appears as an extra row in capture mode.",
			(setting) => {
				setting.addText((text) =>
					text
						.setPlaceholder("Inbox.md")
						.setValue(this.plugin.settings.captureInboxPath)
						.onChange((value) => {
							this.plugin.settings.captureInboxPath = value.trim();
							void this.plugin.saveSettings();
						})
				);
			}
		);

		proSearch("Capture placement", "Add captured lines to the end (append) or top (prepend) of the target note.", (setting) => {
			setting.addDropdown((dropdown) => {
				dropdown
					.addOption("append", "Append to end")
					.addOption("prepend", "Prepend to top")
					.setValue(this.plugin.settings.captureMode)
					.onChange((value: "append" | "prepend") => {
						this.plugin.settings.captureMode = value;
						void this.plugin.saveSettings();
					});
			});
		});

		proSearch(
			"Capture under heading",
			"Optional heading (e.g. Log) to append captured lines beneath. Created if missing. Leave blank to use the placement above.",
			(setting) => {
				setting.addText((text) =>
					text
						.setPlaceholder("Log")
						.setValue(this.plugin.settings.captureHeading)
						.onChange((value) => {
							this.plugin.settings.captureHeading = value.trim();
							void this.plugin.saveSettings();
						})
				);
			}
		);

		new Setting(containerEl).setName("Snippets (Pro)").setHeading();
		const snippetList = containerEl.createDiv();
		if (!this.plugin.settings.isPro) {
			snippetList.createEl("p", {
				text: "Unlock Pro to insert reusable text snippets with {{date}}, {{time}}, {{clipboard}}, {{selection}}, and {{cursor}} placeholders.",
			});
		} else {
			new Setting(snippetList)
				.setName("Add snippet")
				.setDesc("Snippets appear in snippet mode and insert at the cursor. Placeholders: {{date}} {{time}} {{clipboard}} {{selection}} {{cursor}}.")
				.addButton((button) =>
					button.setButtonText("Add snippet").onClick(() => {
						const snippet = createSnippet(`Snippet ${this.plugin.settings.snippets.length + 1}`, "");
						this.plugin.settings.snippets = [...this.plugin.settings.snippets, snippet].slice(0, MAX_SNIPPETS);
						void this.plugin.saveSettings().then(() => this.display());
					})
				);
			if (this.plugin.settings.snippets.length === 0) {
				snippetList.createEl("p", { text: "No snippets yet. Add one to insert boilerplate, callouts, or signatures from the launcher." });
			} else {
				for (const snippet of this.plugin.settings.snippets) {
					const row = snippetList.createDiv({ cls: "vault-spotlight-snippet-row" });
					const nameInput = row.createEl("input", { type: "text", cls: "vault-spotlight-snippet-name" });
					nameInput.value = snippet.name;
					nameInput.placeholder = "Name";
					nameInput.addEventListener("change", () => {
						snippet.name = nameInput.value.trim() || snippet.name;
						// Resync the field so a whitespace-only entry doesn't leave the
						// visible value diverged from the persisted name.
						nameInput.value = snippet.name;
						void this.plugin.saveSettings();
					});
					const bodyInput = row.createEl("textarea", { cls: "vault-spotlight-snippet-body" });
					bodyInput.value = snippet.body;
					bodyInput.rows = 2;
					bodyInput.placeholder = "Snippet text with {{cursor}}";
					bodyInput.addEventListener("change", () => {
						snippet.body = bodyInput.value;
						void this.plugin.saveSettings();
					});
					const remove = row.createEl("button", { text: "Remove" });
					remove.addEventListener("click", () => {
						this.plugin.settings.snippets = this.plugin.settings.snippets.filter((s) => s.id !== snippet.id);
						void this.plugin.saveSettings().then(() => this.display());
					});
				}
			}
		}

		new Setting(containerEl).setName("Starred files (Pro)").setHeading();
		const starredList = containerEl.createDiv();
		if (!this.plugin.settings.isPro) {
			starredList.createEl("p", { text: `Pin important files with ${mod}+D in the spotlight.` });
		} else if (this.plugin.settings.starredPaths.length === 0) {
			starredList.createEl("p", { text: `No starred files yet. Select a result and press ${mod}+D.` });
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

		new Setting(containerEl).setName("Workflow presets (Pro)").setHeading();
		const workflowList = containerEl.createDiv();
		if (!this.plugin.settings.isPro) {
			workflowList.createEl("p", { text: "Unlock Pro to save and run reusable workflows from Browse." });
		} else {
			new Setting(workflowList)
				.setName("Starter workflows")
				.setDesc("Seed Browse mode with a few high-signal workflow presets.")
				.addButton((button) =>
					button.setButtonText("Load starters").onClick(() => {
						this.plugin.settings.workflowPresets = ensureStarterWorkflows(this.plugin.settings.workflowPresets);
						void this.plugin.saveSettings().then(() => this.display());
					})
				);
			if (this.plugin.settings.workflowPresets.length === 0) {
				workflowList.createEl("p", { text: `No workflows yet. Save one from Spotlight with ${mod}+S, or load the starter workflows.` });
			} else {
				for (const workflow of this.plugin.settings.workflowPresets) {
					const row = workflowList.createDiv({ cls: "vault-spotlight-starred-row" });
					row.createSpan({
						text: `${workflow.pinned ? "★ " : ""}${workflow.name}: ${workflow.mode}${workflow.query ? ` · ${workflow.query}` : ""}${workflow.rankingMode ? ` · ${workflow.rankingMode}` : ""}`,
					});
					const pinBtn = row.createEl("button", { text: workflow.pinned ? "Unpin" : "Pin" });
					pinBtn.addEventListener("click", () => {
						this.plugin.settings.workflowPresets = this.plugin.settings.workflowPresets.map((entry) =>
							entry.id === workflow.id ? { ...entry, pinned: !entry.pinned } : entry
						);
						void this.plugin.saveSettings().then(() => this.display());
					});
					const remove = row.createEl("button", { text: workflow.starter ? "Hide" : "Remove" });
					remove.addEventListener("click", () => {
						this.plugin.settings.workflowPresets = this.plugin.settings.workflowPresets.filter((entry) => entry.id !== workflow.id);
						void this.plugin.saveSettings().then(() => this.display());
					});
				}
			}
		}

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
			customList.createEl("p", { text: `No custom searches yet. Create one from the spotlight with ${mod}+S.` });
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