import esbuild from "esbuild";
import process from "process";

const prod = process.argv.includes("production");

const context = await esbuild.context({
	banner: {
		js: "/* Vault Spotlight */",
	},
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"child_process",
		"util",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
	],
	format: "cjs",
	target: "es2018",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	// Minify only production builds; dev/watch stays readable for debugging.
	// This is the real bundle-size lever: a single-file Obsidian CJS plugin ships
	// one main.js, so lazy-loading/code-splitting can't shrink what's on disk (every
	// byte stays in the file) — minify roughly halves it (~339 KB -> ~186 KB). The
	// heavy content/ripgrep runtime work is already lazy (worker + rg spawn on first
	// content search), so there was nothing to defer there anyway.
	minify: prod,
	outfile: "main.js",
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}