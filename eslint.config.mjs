import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

/**
 * Runs the SAME ruleset as Obsidian's automated community-plugin review
 * (eslint-plugin-obsidianmd) so review failures are caught locally before a release
 * — plus our own type-aware rules on the plugin source. `npm run lint` is a hard
 * gate (`--max-warnings 0`); a warning can still block review.
 */
export default tseslint.config(
	{
		ignores: [
			"main.js",
			"node_modules/**",
			"tests/**",
			"scripts/**",
			"esbuild.config.mjs",
			"version-bump.mjs",
			"eslint.config.mjs",
			"src/**/*.mjs",
			"src/**/*.d.mts",
		],
	},
	// The Obsidian review bot's ruleset: manifest validation, settings-tab headings,
	// static-style assignment, forbidden elements, sentence-case, command naming, etc.
	// (It already brings typescript-eslint's non-type-checked base rules.)
	...obsidianmd.configs.recommended,
	// Re-enable our own type-aware rules on the plugin source (the obsidianmd
	// recommended set ships with type-checked linting disabled). Scoped to src/**/*.ts
	// so the JS/JSON config files above are never parsed with type info.
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			// `ui/sentence-case` with enforceCamelCaseLower fires on our product name
			// ("Vault Spotlight") and proper nouns (Pro, Markdown, Bases Power Pack, the
			// `rg` command) — lowercasing them would be wrong, and the actual review does
			// not flag these strings. Setting NAMES are already sentence case.
			"obsidianmd/ui/sentence-case": "off",
			// Advises the declarative settings API added in Obsidian 1.13.0; this plugin
			// targets minAppVersion 1.5.0 and uses the classic display() settings tab.
			"obsidianmd/settings-tab/prefer-setting-definitions": "off",
			// The two flagged spots create DETACHED elements (staged off-DOM, populated
			// with textContent only — no XSS surface) via ownerDocument.createElement,
			// which keeps correct document ownership in popout windows. The suggested
			// `ownerDocument.win.createDiv()` isn't typed in the current obsidian d.ts
			// (resolves to `error`/any, tripping no-unsafe-*). Our usage is safe.
			"obsidianmd/prefer-create-el": "off",
			"@typescript-eslint/no-floating-promises": "warn",
			"@typescript-eslint/no-misused-promises": "warn",
			"@typescript-eslint/no-unnecessary-type-assertion": "warn",
			"@typescript-eslint/no-unsafe-assignment": "warn",
			"@typescript-eslint/no-unsafe-argument": "warn",
			"@typescript-eslint/no-unsafe-call": "warn",
			"@typescript-eslint/no-unsafe-member-access": "warn",
			"@typescript-eslint/no-unsafe-return": "warn",
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-floating-promises": "warn",
			"@typescript-eslint/no-misused-promises": "warn",
			// Popout-window compatibility: never touch the main window's globals.
			"no-restricted-globals": [
				"warn",
				{
					name: "document",
					message: "Use ownerDocument/activeDocument for popout window compatibility.",
				},
				{
					name: "globalThis",
					message: "Use window/activeWindow for popout window compatibility.",
				},
			],
		},
	}
);
