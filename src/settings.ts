import { App, Notice, Platform, PluginSettingTab, Setting } from "obsidian";
import type VaultSpotlightPlugin from "./main";
import { DEFAULT_RANKING_SETTINGS } from "./core/ranking.mjs";
import { FREE_WORKFLOW_LIMIT, STARTER_WORKFLOWS } from "./core/workflowPresets.mjs";
import { normalizeSavedWorkflows, type SavedWorkflow } from "./core/savedWorkflows.mjs";
import { createSnippet, MAX_SNIPPETS } from "./core/snippets.mjs";
import {
	DEFAULT_ESCAPE_CHAR,
	DEFAULT_MODE_PREFIXES,
	normalizeEscapeChar,
	normalizeModePrefixes,
	reconcileEscapeChar,
} from "./core/modeTriggers.mjs";
import { getModifierLabel } from "./core/modalCopy.mjs";
import { isProOnlyMode, PRO_UNLOCK_SUMMARY } from "./core/featureGates.mjs";

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

/**
 * Create an outbound link that is always safe: the href is sanitised to http(s)
 * (a stored "javascript:" value can't become a clickable script — self-XSS), and
 * it opens in a new tab with rel="noopener noreferrer". Every external link in the
 * plugin (settings tab + modal Pro CTA) goes through here so none forgets a guard.
 */
export function createExternalLink(
	parent: HTMLElement,
	options: { text: string; url: string; fallback: string; cls?: string }
): HTMLAnchorElement {
	const link = parent.createEl("a", {
		cls: options.cls,
		text: options.text,
		href: safeHttpUrl(options.url, options.fallback),
	});
	link.setAttr("target", "_blank");
	link.setAttr("rel", "noopener noreferrer");
	return link;
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
	// The unified saved-object list — the ONE concept going forward. The legacy
	// arrays below (customSearches, pinnedCustomSearchIds, workflowPresets,
	// searchProfiles, activeProfileId) are kept, non-destructively, only so a
	// migrated user's data.json isn't rewritten lossily during the deprecation
	// window; new writes go to savedWorkflows.
	savedWorkflows: SavedWorkflow[];
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
	// Show the "Quick actions" cluster (Quick capture, Today's daily note) at the top
	// of the empty-query home view.
	showHomeActions: boolean;
	captureInboxPath: string;
	captureMode: "append" | "prepend";
	captureHeading: string;
	snippets: Snippet[];
	// First-run onboarding: how many times the launcher has been opened (capped),
	// and whether the user dismissed the first-run guidance early.
	openCount: number;
	onboardingDismissed: boolean;
	// Data-model version marker. schemaVersion < 1 (or a data.json with no
	// savedWorkflows field) triggers the one-time saved-search consolidation in
	// loadSettings, which folds the legacy arrays into savedWorkflows.
	schemaVersion: number;
}

export const MAX_CUSTOM_SEARCHES = 50;
export const MAX_RECENT_SEARCHES = 15;

export const DEFAULT_SETTINGS: VaultSpotlightSettings = {

	licenseKey: "",
	isPro: false,
	licenseEmail: "",
	purchaseUrl: "https://buymeacoffee.com/vaultspotlight/e/560202",
	recentPaths: [],
	starredPaths: [],
	maxRecent: 30,
	maxStarred: 50,
	savedWorkflows: [],
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
	showHomeActions: true,
	captureInboxPath: "",
	captureMode: "append",
	captureHeading: "",
	snippets: [],
	openCount: 0,
	onboardingDismissed: false,
	schemaVersion: 1,
};

export const MAX_RECENT_COMMANDS = 25;

export class VaultSpotlightSettingTab extends PluginSettingTab {
	plugin: VaultSpotlightPlugin;
	// Reference to the live escape-char field so a forced reconcile can update it
	// in place rather than rebuilding the whole tab (which drops focus mid-type).
	private escapeInput: HTMLInputElement | null = null;

	constructor(app: App, plugin: VaultSpotlightPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Store the escape char, but reconcile it against the live mode prefixes
	 * first (it is matched before prefixes, so a collision would silently make a
	 * search mode unreachable — the same guard loadSettings runs at startup).
	 * When a collision forces a different character, tell the user and update the
	 * field in place so it shows the value that actually took effect — without
	 * a full display() rebuild that would destroy the input the user is editing.
	 */
	private reconcileEscapeChar(intended: string): void {
		const normalized = normalizeEscapeChar(intended);
		const reconciled = reconcileEscapeChar(intended, this.plugin.settings.modePrefixes);
		this.plugin.settings.escapeChar = reconciled;
		if (reconciled !== normalized) {
			new Notice(`Vault Spotlight: escape character set to "${reconciled}" so it doesn't clash with a mode trigger.`);
			if (this.escapeInput) this.escapeInput.value = reconciled;
		}
	}

	/** Append the shared accent "Pro" pill to a setting's name — one affordance
	 * for gating everywhere, instead of ad-hoc "(Pro)" text. */
	private markPro(setting: Setting): void {
		setting.nameEl.createSpan({ cls: "vault-spotlight-pro-pill", text: "Pro" });
	}

	/** A section heading carrying the shared Pro pill. */
	private proHeading(name: string): void {
		const heading = new Setting(this.containerEl).setName(name).setHeading();
		this.markPro(heading);
	}

	/** Inline "Upgrade to Pro" link appended to a locked row's description. */
	private appendUpgrade(setting: Setting): void {
		setting.descEl.appendText(" ");
		createExternalLink(setting.descEl, {
			cls: "vault-spotlight-upgrade-inline",
			text: "Upgrade to Pro",
			url: this.plugin.settings.purchaseUrl,
			fallback: DEFAULT_SETTINGS.purchaseUrl,
		});
	}

	display(): void {
		const { containerEl } = this;
		const mod = getModifierLabel(Platform.isMacOS || Platform.isIosApp ? "mac" : "");
		containerEl.empty();

		new Setting(containerEl).setName("License").setHeading();

		new Setting(containerEl)
			.setName("License key")
			.setDesc("Enter your Pro license key. Verified offline — no account or server required.")
			.addText((text) =>
				text
					.setPlaceholder("Paste your license key")
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
			status.addClass("is-pro");
			status.createEl("p", {
				text: `Pro active${this.plugin.settings.licenseEmail ? ` (${this.plugin.settings.licenseEmail})` : ""}. Thank you for supporting Vault Spotlight.`,
			});
		} else {
			status.createEl("p", {
				text: `Free tier active. Upgrade to unlock ${PRO_UNLOCK_SUMMARY}.`,
			});
			createExternalLink(status, {
				cls: "vault-spotlight-pro-btn",
				text: "Get Vault Spotlight Pro",
				url: this.plugin.settings.purchaseUrl,
				fallback: DEFAULT_SETTINGS.purchaseUrl,
			});
		}

		new Setting(containerEl).setName("Display").setHeading();

		new Setting(containerEl)
			.setName("Show modified time")
			.setDesc("Display relative modified time in search results.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showModifiedTime).onChange((value) => {
					this.plugin.settings.showModifiedTime = value;
					void this.plugin.saveSettings();
				})
			);

		new Setting(containerEl).setName("Ranking & match reasons").setHeading();

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
					.onChange((value: string) => {
						// The value is always one of the addOption keys above; narrow the
						// string Obsidian's onChange hands back to the settings union.
						this.plugin.settings.ranking.mode = value as RankingSettings["mode"];
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
			.setName("Prefer starred files")
			.setDesc("Boost files you've starred toward the top of browse results.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.ranking.preferStarredFiles).onChange((value) => {
					this.plugin.settings.ranking.preferStarredFiles = value;
					void this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Prefer bookmarked files")
			.setDesc("Boost files bookmarked in the core Bookmarks plugin.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.ranking.preferBookmarkedFiles).onChange((value) => {
					this.plugin.settings.ranking.preferBookmarkedFiles = value;
					void this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Prefer recent files")
			.setDesc("Boost recently opened notes toward the top of browse results.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.ranking.preferRecentFiles).onChange((value) => {
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

		new Setting(containerEl)
			.setName("Home quick actions")
			.setDesc("Show a Quick actions row (Quick capture, Today's daily note) at the top of the launcher when it opens on an empty query. Today's daily note follows the date-jump setting above.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showHomeActions).onChange((value) => {
					this.plugin.settings.showHomeActions = value;
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

		// The "(Pro)" suffix is DERIVED from featureGates.isProOnlyMode, not typed
		// per-row, so a future gating change can't leave a label lying.
		const prefixLabels: Array<{ key: keyof ModePrefixes; name: string; desc: string }> = [
			{ key: "content", name: "Content search trigger", desc: "Search inside note bodies." },
			{ key: "commands", name: "Command trigger", desc: "Search and run commands." },
			{ key: "headings", name: "Headings trigger", desc: "Jump to headings across the vault." },
			{ key: "symbols", name: "Symbols trigger", desc: "Outline of the active note: headings, links, tags, blocks." },
			{ key: "links", name: "Links trigger", desc: "Backlinks and outlinks." },
			{ key: "editors", name: "Open editors trigger", desc: "Jump between open tabs and panes." },
			{ key: "folders", name: "Folders trigger", desc: "Find a folder and browse its files." },
			{ key: "capture", name: "Quick capture trigger", desc: "Append a note to your daily note or inbox without opening it." },
			{ key: "snippets", name: "Snippets trigger", desc: "Insert reusable text snippets at the cursor." },
		];
		for (const { key, name, desc } of prefixLabels) {
			const proSuffix = isProOnlyMode(key) ? " (Pro)" : "";
			new Setting(containerEl)
				.setName(name)
				.setDesc(`${desc}${proSuffix} Default: ${DEFAULT_MODE_PREFIXES[key]}`)
				.addText((text) => {
					text.inputEl.maxLength = 4;
					text.inputEl.addClass("vault-spotlight-prefix-input");
					text.setValue(this.plugin.settings.modePrefixes[key]).onChange((value) => {
						this.plugin.settings.modePrefixes = normalizeModePrefixes({
							...this.plugin.settings.modePrefixes,
							[key]: value,
						});
						// A newly-set prefix may now collide with the escape char,
						// which is matched first and would make this mode unreachable.
						this.reconcileEscapeChar(this.plugin.settings.escapeChar);
						void this.plugin.saveSettings();
					});
					// Resync the field to the value that actually took effect — but only
					// on blur, not per keystroke. normalizeModePrefixes rejects a prefix
					// that collides with another trigger (folding it back to a default),
					// yet the field kept showing what was typed, silently diverging from
					// the stored value. A per-keystroke reset would instead make a
					// multi-char prefix like ">>" unenterable (its first ">" transiently
					// collides with content), so commit the reconcile on focusout.
					text.inputEl.addEventListener("focusout", () => {
						const effective = this.plugin.settings.modePrefixes[key];
						if (text.inputEl.value !== effective) {
							text.inputEl.value = effective;
							new Notice(`Vault Spotlight: "${name}" set to "${effective}" so it doesn't clash with another trigger.`);
						}
					});
				});
		}

		new Setting(containerEl)
			.setName("Escape character")
			.setDesc(`Start a query with this character to search trigger characters literally. Default: ${DEFAULT_ESCAPE_CHAR}`)
			.addText((text) => {
				text.inputEl.maxLength = 1;
				text.inputEl.addClass("vault-spotlight-prefix-input");
				this.escapeInput = text.inputEl;
				text.setValue(this.plugin.settings.escapeChar).onChange((value) => {
					this.reconcileEscapeChar(value);
					void this.plugin.saveSettings();
				});
			});

		this.proHeading("Search & preview");

		const proSearch = (name: string, desc: string, render: (setting: Setting) => void) => {
			const setting = new Setting(containerEl).setName(name).setDesc(desc);
			this.markPro(setting);
			if (!this.plugin.settings.isPro) {
				// Locked rows show a disabled control + lock, not an empty right side
				// that reads as a rendering bug, plus a path to unlock.
				setting.settingEl.addClass("vault-spotlight-setting-locked");
				setting.addExtraButton((btn) => btn.setIcon("lock").setDisabled(true).setTooltip("Pro feature"));
				this.appendUpgrade(setting);
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
					.onChange((value: string) => {
						this.plugin.settings.captureMode = value === "prepend" ? "prepend" : "append";
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

		this.proHeading("Snippets");
		const snippetList = containerEl.createDiv();
		if (!this.plugin.settings.isPro) {
			snippetList.createEl("p", {
				cls: "vault-spotlight-hint-text",
				text: "Unlock Pro to insert reusable text snippets with {{date}}, {{time}}, {{clipboard}}, {{selection}}, and {{cursor}} placeholders.",
			});
		} else {
			new Setting(snippetList)
				.setName("Snippets")
				.setDesc(`Snippets appear in snippet mode and insert at the cursor. Placeholders: {{date}} {{time}} {{clipboard}} {{selection}} {{cursor}}. ${this.plugin.settings.snippets.length}/${MAX_SNIPPETS} used.`)
				.addButton((button) =>
					button.setButtonText("Add snippet").onClick(() => {
						const snippet = createSnippet(`Snippet ${this.plugin.settings.snippets.length + 1}`, "");
						this.plugin.settings.snippets = [...this.plugin.settings.snippets, snippet].slice(0, MAX_SNIPPETS);
						void this.plugin.saveSettings().then(() => this.display());
					})
				);
			if (this.plugin.settings.snippets.length === 0) {
				snippetList.createEl("p", { cls: "vault-spotlight-hint-text", text: "No snippets yet. Add one to insert boilerplate, callouts, or signatures from the launcher." });
			} else {
				for (const snippet of this.plugin.settings.snippets) {
					const row = snippetList.createDiv({ cls: "vault-spotlight-snippet-row" });
					const nameInput = row.createEl("input", { type: "text", cls: "vault-spotlight-snippet-name" });
					nameInput.value = snippet.name;
					nameInput.placeholder = "Name";
					// Placeholders vanish once populated and aren't a reliable
					// accessible name, so label the fields explicitly for screen readers.
					nameInput.setAttribute("aria-label", "Snippet name");
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
					bodyInput.setAttribute("aria-label", "Snippet body");
					bodyInput.addEventListener("change", () => {
						snippet.body = bodyInput.value;
						void this.plugin.saveSettings();
					});
					const remove = row.createEl("button", { cls: "mod-warning", text: "Remove" });
					remove.setAttribute("aria-label", `Remove snippet ${snippet.name}`);
					remove.addEventListener("click", () => {
						const removed = snippet;
						this.plugin.settings.snippets = this.plugin.settings.snippets.filter((s) => s.id !== removed.id);
						// Offer a quick undo so a mis-click isn't silently destructive.
						const notice = new Notice("", 6000);
						notice.noticeEl.createSpan({ text: `Removed "${removed.name}". ` });
						const undo = notice.noticeEl.createEl("a", { text: "Undo", cls: "vault-spotlight-clickable" });
						undo.addEventListener("click", () => {
							this.plugin.settings.snippets = [...this.plugin.settings.snippets, removed].slice(0, MAX_SNIPPETS);
							void this.plugin.saveSettings().then(() => this.display());
							notice.hide();
						});
						void this.plugin.saveSettings().then(() => this.display());
					});
				}
			}
		}

		this.proHeading("Starred files");
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
				btn.setAttribute("aria-label", `Remove starred file ${path}`);
				btn.addEventListener("click", () => {
					this.plugin.settings.starredPaths = this.plugin.settings.starredPaths.filter((p) => p !== path);
					void this.plugin.saveSettings().then(() => this.display());
				});
			}
		}

		const aliasSetting = new Setting(containerEl)
			.setName("Search aliases")
			.setDesc("One alias per line, e.g. crm = in:Clients @type:client. Aliases expand before search.");
		this.markPro(aliasSetting);
		if (!this.plugin.settings.isPro) {
			// Aliases are Pro-gated (expandAliases no-ops without Pro), so match the
			// other Pro rows: a disabled lock + upgrade path, not an editable field
			// whose contents are silently ignored on the free tier.
			aliasSetting.settingEl.addClass("vault-spotlight-setting-locked");
			aliasSetting.addExtraButton((btn) => btn.setIcon("lock").setDisabled(true).setTooltip("Pro feature"));
			this.appendUpgrade(aliasSetting);
		} else {
			aliasSetting.addTextArea((area) => {
				area.setPlaceholder("crm = in:Clients @type:client\nwaiting = #waiting");
				area.setValue(this.plugin.settings.searchAliases);
				area.inputEl.rows = 4;
				area.onChange((value) => {
					this.plugin.settings.searchAliases = value;
					void this.plugin.saveSettings();
				});
			});
		}

		// ONE saved-object list. Workflows, Search profiles, and Custom searches used
		// to be three separate sections; they were folded into this single list and a
		// user's existing entries were migrated on load (see loadSettings). Free is
		// capped; Pro is unlimited and can seed curated starters — a plain heading, not
		// a Pro-locked one.
		new Setting(containerEl)
			.setName("Saved workflows")
			.setDesc(`Your one saved object: save a search (mode + query, plus optional scope) with ${mod}+S and re-run it from Browse. Free includes ${FREE_WORKFLOW_LIMIT}; Pro is unlimited and can load starters.`)
			.setHeading();
		const workflowList = containerEl.createDiv();
		const isProUser = this.plugin.settings.isPro;
		if (isProUser) {
			new Setting(workflowList)
				.setName("Starter workflows")
				.setDesc("Seed Browse with a few high-signal saved workflows.")
				.addButton((button) =>
					button.setButtonText("Load starters").onClick(() => {
						// Match the old ensureStarterWorkflows semantics: only seed when the
						// list is empty, so this never duplicates a user's own workflows.
						if (this.plugin.settings.savedWorkflows.length === 0) {
							this.plugin.settings.savedWorkflows = normalizeSavedWorkflows(STARTER_WORKFLOWS);
						}
						void this.plugin.saveSettings().then(() => this.display());
					})
				);
		}
		const saved = this.plugin.settings.savedWorkflows;
		if (saved.length === 0) {
			workflowList.createEl("p", {
				text: isProUser
					? `No saved workflows yet. Save one from Spotlight with ${mod}+S, or load the starters.`
					: `No saved workflows yet. Save up to ${FREE_WORKFLOW_LIMIT} from Spotlight — press ${mod}+S on any search to keep it.`,
			});
		} else {
			for (const workflow of saved) {
				const row = workflowList.createDiv({ cls: "vault-spotlight-starred-row" });
				// Advanced facets (scope / sticky / command) surface as inline tags so
				// the one list still shows the depth folded in from profiles + custom
				// searches, without three separate sections.
				const tags = [
					workflow.rankingMode ? workflow.rankingMode : "",
					workflow.scope ? "scoped" : "",
					workflow.sticky ? "sticky" : "",
					workflow.exposeAsCommand ? "command" : "",
				].filter(Boolean);
				row.createSpan({
					text: `${workflow.pinned ? "★ " : ""}${workflow.name}: ${workflow.mode}${workflow.query ? ` · ${workflow.query}` : ""}${tags.length ? ` · ${tags.join(" · ")}` : ""}`,
				});
				const pinBtn = row.createEl("button", { text: workflow.pinned ? "Unpin" : "Pin" });
				pinBtn.setAttribute("aria-label", `${workflow.pinned ? "Unpin" : "Pin"} workflow ${workflow.name}`);
				pinBtn.addEventListener("click", () => {
					this.plugin.settings.savedWorkflows = this.plugin.settings.savedWorkflows.map((entry) =>
						entry.id === workflow.id ? { ...entry, pinned: !entry.pinned } : entry
					);
					void this.plugin.saveSettings().then(() => this.display());
				});
				const remove = row.createEl("button", { text: workflow.starter ? "Hide" : "Remove" });
				remove.setAttribute("aria-label", `${workflow.starter ? "Hide" : "Remove"} workflow ${workflow.name}`);
				remove.addEventListener("click", () => {
					this.plugin.settings.savedWorkflows = this.plugin.settings.savedWorkflows.filter((entry) => entry.id !== workflow.id);
					// A command-exposed workflow also unregisters its custom-search-<id>
					// command so a removed row can't leave a live (bindable) command.
					if (workflow.exposeAsCommand) this.plugin.unregisterSavedWorkflowCommand(workflow.id);
					void this.plugin.saveSettings().then(() => this.display());
				});
			}
		}
		// Free-tier allowance + upgrade path once at least one workflow exists.
		if (!isProUser && saved.length > 0) {
			const used = saved.filter((w) => !w.starter).length;
			const usage = new Setting(workflowList).setName(
				`${Math.min(used, FREE_WORKFLOW_LIMIT)} of ${FREE_WORKFLOW_LIMIT} free workflows used`
			);
			this.appendUpgrade(usage);
		}

		// Support links, not promotion: GitHub issues are the only place bugs and
		// feature requests are tracked. Rendered last so it never pushes real settings
		// down the tab. window.open (not a raw anchor) so Obsidian hands it to the
		// system browser on desktop and mobile alike.
		new Setting(containerEl).setName("Feedback").setHeading();

		new Setting(containerEl)
			.setName("Bugs and feature requests")
			.setDesc("Issues and ideas are tracked on GitHub. Opens in your browser.")
			.addButton((button) =>
				button.setButtonText("Report a bug").onClick(() => {
					window.open("https://github.com/israerusan/obsidian-vault-spotlight/issues/new?labels=bug");
				})
			)
			.addButton((button) =>
				button.setButtonText("Request a feature").onClick(() => {
					window.open("https://github.com/israerusan/obsidian-vault-spotlight/issues/new?labels=enhancement");
				})
			);
	}
}