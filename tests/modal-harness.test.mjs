// Modal INTERACTION harness: runs the REAL SpotlightModal (bundled from src, with
// obsidian + the DOM faked) over the fixture vault. Opens the modal, inspects the
// registered keyboard scope, drives a query to results, activates with Enter, and
// saves a workflow end-to-end on the FREE tier — the behavioral proof of the
// free-workflow-save fix that a source-string check cannot give.
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildHarness } from "./harness/build.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vaultDir = path.join(__dirname, "fixtures", "vault");

const outfile = await buildHarness();
const h = await import(pathToFileURL(outfile).href);
const { loadVaultApp, SpotlightModal, makeStubPlugin, Modal, FakeEvent, installWindow, uninstallWindow } = h;

installWindow();
const settle = () => new Promise((r) => setTimeout(r, 250));
const hasMod = (b, m) => b.modifiers.map((x) => x.toLowerCase()).includes(m.toLowerCase());
const findKey = (modal, mods, key) =>
	modal.scope.keys.find((b) => b.key === key && mods.every((m) => hasMod(b, m)) && b.modifiers.length === mods.length);

// --- 1. FREE tier: onOpen runs and Mod+S (save workflow) IS registered ---------
// Regression for the free-workflow-save bug: previously Mod+S was registered only
// after the Pro gate, so a free modal had no Mod+S binding at all.
{
	const { app } = loadVaultApp(vaultDir);
	const plugin = makeStubPlugin(app, { isPro: false });
	const modal = new SpotlightModal(app, plugin, "", "files");
	modal.open();
	assert.ok(modal.scope.keys.length > 0, "onOpen registered keyboard shortcuts");
	assert.ok(findKey(modal, ["Mod"], "s"), "FREE tier registers Mod+S (save workflow)");
	assert.ok(findKey(modal, [], "Enter"), "Enter is registered");
	assert.ok(findKey(modal, [], "Tab"), "Tab (mode cycle) is registered");
	// Pro-only shortcuts must NOT be present on the free tier (they're registered
	// after the `if (!isPro) return` gate).
	assert.ok(!findKey(modal, ["Mod"], "d"), "FREE tier does NOT register the Pro Mod+D (star)");
	assert.ok(!findKey(modal, ["Mod"], " "), "FREE tier does NOT register the Pro Mod+Space (multi-select)");
	modal.close();
}

// --- 1c. Driving the real `input` event (not just the seeded initialQuery) -----
// Exercises the input listener -> scheduleSearch (debounce) -> runSearch path.
{
	const { app } = loadVaultApp(vaultDir);
	const plugin = makeStubPlugin(app, { isPro: false });
	const modal = new SpotlightModal(app, plugin, "", "files");
	modal.open();
	await settle();
	modal.inputEl.value = "roadmap";
	modal.inputEl.dispatchEvent(new FakeEvent("input", { isComposing: false }));
	await settle();
	assert.ok(
		modal.items.some((it) => it.kind === "file" && it.file.basename === "Roadmap"),
		"typing into the input (real input event + debounce) drives a live search"
	);
	modal.close();
}

// --- 2. Type a query -> real results appear in the modal ----------------------
{
	const { app } = loadVaultApp(vaultDir);
	const plugin = makeStubPlugin(app, { isPro: false });
	const modal = new SpotlightModal(app, plugin, "roadmap", "files");
	modal.open();
	await settle();
	assert.ok(modal.items.length > 0, "a query produces results in the modal");
	const top = modal.items[0];
	assert.equal(top.kind, "file", "top result is a file");
	assert.equal(top.file.basename, "Roadmap", "the modal ranks Roadmap first for 'roadmap'");
	modal.close();
}

// --- 3. Enter activates the selected result -> opens the file -----------------
{
	const { app } = loadVaultApp(vaultDir);
	const plugin = makeStubPlugin(app, { isPro: false });
	const modal = new SpotlightModal(app, plugin, "roadmap", "files");
	modal.open();
	await settle();
	modal.selectedIndex = 0;
	findKey(modal, [], "Enter").handler(new FakeEvent("keydown", { isComposing: false }));
	await settle();
	assert.equal(app.openedFiles.length, 1, "Enter opened exactly one file");
	assert.equal(app.openedFiles[0].basename, "Roadmap", "Enter opened the selected note");
}

// --- 4. FREE tier: Mod+S saves a workflow END-TO-END --------------------------
// The crown-jewel behavioral check: a free user presses Mod+S, names the workflow,
// and it persists. Before the fix this was impossible (no Mod+S binding).
{
	const { app } = loadVaultApp(vaultDir);
	const plugin = makeStubPlugin(app, { isPro: false });
	const modal = new SpotlightModal(app, plugin, "action item", "content");
	modal.open();
	await settle();
	assert.equal(plugin.settings.savedWorkflows.length, 0, "starts with no workflows");

	// Press Mod+S — opens the name prompt (a PromptModal). Assert a NEW modal opened
	// via a count delta rather than assuming it's last in the static registry.
	// (Note: the handler is invoked through the recorded scope binding; this proves
	// registration + handler logic, not Obsidian's own key routing.)
	const openedBefore = Modal.opened.length;
	findKey(modal, ["Mod"], "s").handler(new FakeEvent("keydown", { isComposing: false }));
	assert.equal(Modal.opened.length, openedBefore + 1, "Mod+S opened exactly one new modal (the name prompt)");
	const prompt = Modal.opened[Modal.opened.length - 1];
	assert.ok(prompt !== modal, "the new modal is the save-workflow prompt, not the spotlight modal");

	// Type a name and confirm with Enter (real keydown listener on the prompt input).
	const input = prompt.contentEl.querySelector("input");
	assert.ok(input, "the prompt has a text input");
	input.value = "My Saved Search";
	input.dispatchEvent(new FakeEvent("keydown", { key: "Enter" }));

	assert.equal(plugin.settings.savedWorkflows.length, 1, "the workflow was persisted on the FREE tier");
	const saved = plugin.settings.savedWorkflows[0];
	assert.equal(saved.name, "My Saved Search", "saved with the entered name");
	assert.equal(saved.query, "action item", "saved with the live query");
	assert.ok(plugin.saveCalls > 0, "settings were saved");
	modal.close();
}

// --- 5. FREE tier is capped at the free workflow limit ------------------------
{
	const { app } = loadVaultApp(vaultDir);
	const plugin = makeStubPlugin(app, {
		isPro: false,
		savedWorkflows: [
			{ id: "w1", name: "One", query: "a", mode: "files" },
			{ id: "w2", name: "Two", query: "b", mode: "files" },
		],
	});
	const modal = new SpotlightModal(app, plugin, "roadmap", "files");
	modal.open();
	await settle();
	// At the 2-workflow free cap, saveCurrentWorkflow shows a notice and opens NO prompt.
	const openedBefore = Modal.opened.length;
	findKey(modal, ["Mod"], "s").handler(new FakeEvent("keydown", { isComposing: false }));
	assert.equal(Modal.opened.length, openedBefore, "at the free cap, Mod+S opens no save prompt");
	assert.equal(plugin.settings.savedWorkflows.length, 2, "no workflow added past the free cap");
	modal.close();
}

// --- 6. Browse hierarchy: Workflows rank above profiles and legacy collections --
// Locks the Phase-2 Step-2 reorder: the canonical saved object (Workflows) is on top,
// advanced profiles below, and the retired "Smart collections" (custom searches) last.
{
	const { app } = loadVaultApp(vaultDir);
	const plugin = makeStubPlugin(app, {
		isPro: true,
		workflowPresets: [{ id: "wf", name: "My WF", query: "roadmap", mode: "files", pinned: false }],
		searchProfiles: [
			{ id: "pf", name: "My Profile", defaultMode: "files", defaultQuery: "", includeCanvas: true, includePdf: true, includeBases: true, excludeFolders: [], showPreview: false },
		],
		customSearches: [{ id: "cs", name: "Legacy Search", query: "old" }],
		pinnedCustomSearchIds: ["cs"],
	});
	const modal = new SpotlightModal(app, plugin, "", "files");
	modal.open();
	await settle();
	const kinds = modal.items.map((it) => it.kind);
	const wf = kinds.indexOf("workflow");
	const pf = kinds.indexOf("profile");
	const col = kinds.indexOf("collection");
	assert.ok(wf >= 0 && pf >= 0 && col >= 0, "browse shows workflow, profile, and collection groups");
	assert.ok(wf < pf && pf < col, "Workflows rank above profiles, which rank above legacy collections");
	modal.close();
}

// --- 7. Help overlay gates the list keys ---------------------------------------
// The cheatsheet (Mod+/) is a modeless overlay, so the fix must make the scope's
// nav/activation keys inert while it's open — otherwise a reflexive Enter would open
// the selected result and tear the whole modal down behind the overlay.
{
	const { app } = loadVaultApp(vaultDir);
	const plugin = makeStubPlugin(app, { isPro: false });
	const modal = new SpotlightModal(app, plugin, "roadmap", "files");
	modal.open();
	await settle();
	assert.ok(modal.items.length > 0, "has results to (not) activate");

	// Open the overlay via Mod+/.
	findKey(modal, ["Mod"], "/").handler(new FakeEvent("keydown", { isComposing: false }));
	assert.ok(modal.contentEl.querySelector(".vault-spotlight-help"), "Mod+/ opened the shortcut overlay");

	// Enter while help is open must be inert: no file opened, and it passes through.
	const before = app.openedFiles.length;
	const ret = findKey(modal, [], "Enter").handler(new FakeEvent("keydown", { isComposing: false }));
	assert.equal(app.openedFiles.length, before, "Enter does NOT activate a result while help is open");
	assert.equal(ret, true, "a gated key passes through (returns true)");

	// Escape closes the overlay, not the modal.
	findKey(modal, [], "Escape").handler(new FakeEvent("keydown", { isComposing: false }));
	assert.ok(!modal.contentEl.querySelector(".vault-spotlight-help"), "Escape dismissed the help overlay");

	// With help closed, Enter activates again.
	modal.selectedIndex = 0;
	findKey(modal, [], "Enter").handler(new FakeEvent("keydown", { isComposing: false }));
	await settle();
	assert.equal(app.openedFiles.length, before + 1, "Enter activates again once help is closed");
	modal.close();
}

uninstallWindow();
console.log("modal harness tests passed");
