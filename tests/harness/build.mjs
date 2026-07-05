// Bundles the harness entry (real src/search/*.ts) for Node, aliasing the
// `obsidian` import to the local mock. Returns the path to the generated ESM
// bundle, which the test then imports and drives against the fixture vault.
import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildHarness() {
	const outfile = path.join(__dirname, ".generated", "harness.mjs");
	await esbuild.build({
		entryPoints: [path.join(__dirname, "entry.mjs")],
		outfile,
		bundle: true,
		platform: "node",
		format: "esm",
		target: "es2020",
		alias: { obsidian: path.join(__dirname, "obsidian-mock.mjs") },
		logLevel: "silent",
	});
	return outfile;
}
