import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Mirrors the rules the Obsidian community review bot flags, so warnings are
 * caught locally before submission: the typescript-eslint unsafe-any family,
 * floating/misused promises, and popout-window-unsafe globals.
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
			"src/**/*.mjs",
			"src/**/*.d.mts",
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
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
