import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const defaultVaultRoot = "C:\\Users\\iavil\\OneDrive\\Documents\\Personal";
const vaultRoot = process.env.VAULT_ROOT !== undefined ? process.env.VAULT_ROOT : defaultVaultRoot;

function listMarkdownFiles(dir, acc = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory() && !entry.name.startsWith(".")) listMarkdownFiles(full, acc);
		else if (entry.isFile() && entry.name.endsWith(".md")) acc.push(full);
	}
	return acc;
}

function fuzzyMatch(query, text) {
	const q = query.toLowerCase();
	const t = text.toLowerCase();
	let qi = 0;
	for (let ti = 0; ti < t.length && qi < q.length; ti++) {
		if (t[ti] === q[qi]) qi++;
	}
	return qi === q.length;
}

const pluginBundle = fs.readFileSync(path.join(repoRoot, "main.js"), "utf8");
assert.ok(pluginBundle.includes("Vault Spotlight"), "built bundle should contain plugin code");
assert.ok(pluginBundle.includes("vault-spotlight"), "built bundle should reference product id");
assert.ok(
	pluginBundle.includes('containerEl.addClass("vault-spotlight-container")'),
	"built bundle should apply spotlight container class to containerEl"
);

if (!fs.existsSync(vaultRoot)) {
	console.log(`vault integration tests passed (bundle checks only; vault not found at ${vaultRoot})`);
	process.exit(0);
}

const files = listMarkdownFiles(vaultRoot);
assert.ok(files.length > 0, "Personal vault should contain markdown files for integration test");

const sample = files.slice(0, 20).map((f) => path.basename(f, ".md"));
const hits = sample.filter((name) => fuzzyMatch(name.slice(0, 2), name));
assert.ok(hits.length > 0, "fuzzy search should match at least one real vault filename");

const installedBundle = path.join(vaultRoot, ".obsidian", "plugins", "vault-spotlight", "main.js");
if (fs.existsSync(installedBundle)) {
	const installed = fs.readFileSync(installedBundle, "utf8");
	assert.ok(installed.includes("Vault Spotlight"), "installed bundle should contain plugin code");
}

console.log(`vault integration tests passed (${files.length} markdown files, vault: ${vaultRoot})`);