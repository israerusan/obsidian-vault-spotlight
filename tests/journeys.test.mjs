// End-to-end JOURNEY harness: drives the REAL SpotlightModal (+ WorkflowController,
// action palette, ContentSearcher) over the fixture vault through complete
// multi-step user flows — save-and-rerun, the free cap + upgrade path, the Ctrl+K
// action palette, and an OR content search — rather than single-unit checks. This
// is the behavioral proof for the saved-workflow consolidation, the feature gates,
// and Boolean OR working together through the modal a user actually touches.
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildHarness } from "./harness/build.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vaultDir = path.join(__dirname, "fixtures", "vault");

const outfile = await buildHarness();
const h = await import(pathToFileURL(outfile).href);
const { loadVaultApp, SpotlightModal, makeStubPlugin, Modal, FakeEvent, Notice, installWindow, uninstallWindow } = h;

installWindow();

// The modal's copy action writes through navigator.clipboard; capture those writes.
const clipboardWrites = [];
Object.defineProperty(globalThis, "navigator", {
	value: { clipboard: { writeText: async (t) => void clipboardWrites.push(t) } },
	configurable: true,
	writable: true,
});

const settle = () => new Promise((r) => setTimeout(r, 250));
const hasMod = (b, m) => b.modifiers.map((x) => x.toLowerCase()).includes(m.toLowerCase());
const findKey = (modal, mods, key) =>
	modal.scope.keys.find((b) => b.key === key && mods.every((m) => hasMod(b, m)) && b.modifiers.length === mods.length);
const press = (modal, mods, key) => findKey(modal, mods, key).handler(new FakeEvent("keydown", { isComposing: false }));

// --- Journey 1: save a search as a workflow with Mod+S, then re-run it from Browse
{
	const { app } = loadVaultApp(vaultDir);
	const plugin = makeStubPlugin(app, { isPro: false });

	// Save the current content search as a workflow.
	const modal = new SpotlightModal(app, plugin, "action item", "content");
	modal.open();
	await settle();
	press(modal, ["Mod"], "s");
	const prompt = Modal.opened[Modal.opened.length - 1];
	const input = prompt.contentEl.querySelector("input");
	input.value = "Weekly review";
	input.dispatchEvent(new FakeEvent("keydown", { key: "Enter" }));
	assert.equal(plugin.settings.savedWorkflows.length, 1, "J1: the search was saved as a workflow");
	modal.close();

	// Re-open on the SAME plugin in Browse; the workflow row is selectable and,
	// when activated, restores its query + mode end-to-end.
	const browse = new SpotlightModal(app, plugin, "", "files");
	browse.open();
	await settle();
	const wfIndex = browse.items.findIndex((it) => it.kind === "workflow" && it.name === "Weekly review");
	assert.ok(wfIndex >= 0, "J1: the saved workflow appears as a Browse row");
	browse.selectedIndex = wfIndex;
	press(browse, [], "Enter");
	await settle();
	assert.equal(browse.inputEl.value, "action item", "J1: activating the workflow restores its query");
	assert.equal(browse.mode, "content", "J1: activating the workflow restores its mode");
	browse.close();
}

// --- Journey 2: free tier hits the workflow cap → upgrade path → Pro unlock
{
	Notice.reset();
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

	// At the cap, Mod+S opens NO prompt and shows the upgrade notice.
	const before = Modal.opened.length;
	press(modal, ["Mod"], "s");
	assert.equal(Modal.opened.length, before, "J2: at the free cap, Mod+S opens no save prompt");
	assert.ok(
		Notice.messages.some((m) => /free plan includes 2 workflows/i.test(m) && /upgrade to pro/i.test(m)),
		"J2: the free-cap notice points to the Pro upgrade"
	);
	assert.equal(plugin.settings.savedWorkflows.length, 2, "J2: nothing was added past the cap");

	// Upgrade to Pro; the same keystroke now opens the prompt and a save succeeds.
	plugin.settings.isPro = true;
	press(modal, ["Mod"], "s");
	const prompt = Modal.opened[Modal.opened.length - 1];
	const input = prompt.contentEl.querySelector("input");
	input.value = "Third";
	input.dispatchEvent(new FakeEvent("keydown", { key: "Enter" }));
	assert.equal(plugin.settings.savedWorkflows.length, 3, "J2: Pro lifts the cap and the save persists");
	modal.close();
}

// --- Journey 3: Ctrl+K opens the action palette with the file actions
{
	const { app } = loadVaultApp(vaultDir);
	const plugin = makeStubPlugin(app, { isPro: false });
	const modal = new SpotlightModal(app, plugin, "roadmap", "files");
	modal.open();
	await settle();
	assert.equal(modal.items[0].kind, "file", "J3: a file result is selected");
	modal.selectedIndex = 0;
	press(modal, ["Mod"], "k");
	await settle();
	const ids = modal.items.filter((it) => it.kind === "action").map((it) => it.action.id);
	for (const id of ["open", "copy-link", "copy-path", "rename"]) {
		assert.ok(ids.includes(id), `J3: the action palette offers "${id}"`);
	}
	modal.close();
}

// --- Journey 4: Ctrl+K → Copy path writes the file path to the clipboard
{
	clipboardWrites.length = 0;
	const { app } = loadVaultApp(vaultDir);
	const plugin = makeStubPlugin(app, { isPro: false });
	const modal = new SpotlightModal(app, plugin, "roadmap", "files");
	modal.open();
	await settle();
	modal.selectedIndex = 0;
	press(modal, ["Mod"], "k");
	await settle();
	const copyIndex = modal.items.findIndex((it) => it.kind === "action" && it.action.id === "copy-path");
	assert.ok(copyIndex >= 0, "J4: the Copy path action is present");
	modal.selectedIndex = copyIndex;
	press(modal, [], "Enter");
	await settle();
	assert.ok(
		clipboardWrites.some((t) => t.endsWith("Roadmap.md")),
		`J4: Copy path wrote the file path to the clipboard (got ${JSON.stringify(clipboardWrites)})`
	);
	modal.close();
}

// --- Journey 5: an OR content search returns the union through the modal (Pro)
{
	const { app } = loadVaultApp(vaultDir);
	const plugin = makeStubPlugin(app, { isPro: true });
	// Signals.md holds "action" and "item" on SEPARATE lines — an AND query misses
	// it, but "action OR item" must surface it (each line satisfies one alternative).
	const modal = new SpotlightModal(app, plugin, "action OR item", "content");
	modal.open();
	await settle();
	const contentHits = modal.items.filter((it) => it.kind === "content");
	assert.ok(contentHits.length > 0, "J5: the OR content search returns rows");
	assert.ok(
		contentHits.some((it) => it.file.path === "Signals.md"),
		"J5: the cross-line note is part of the OR union"
	);
	modal.close();
}

uninstallWindow();
console.log("journey tests passed");
