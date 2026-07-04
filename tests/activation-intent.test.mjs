import assert from "assert";
import { resolveOpenTargets } from "../src/core/activationIntent.mjs";

// Single row, nothing checked, no override, tabs off → open selected in place.
let r = resolveOpenTargets({ selectedPath: "a.md", checkedPaths: [], visiblePaths: ["a.md", "b.md"] });
assert.deepEqual(r, { paths: ["a.md"], target: null, isBatch: false }, "single open in current pane");

// defaultNewTab flips a single open to a tab.
r = resolveOpenTargets({ selectedPath: "a.md", checkedPaths: [], visiblePaths: ["a.md"], defaultNewTab: true });
assert.equal(r.target, "tab", "defaultNewTab opens a single result in a tab");

// An explicit pane override wins over the default.
r = resolveOpenTargets({ selectedPath: "a.md", checkedPaths: [], visiblePaths: ["a.md"], paneOverride: "split", defaultNewTab: true });
assert.equal(r.target, "split", "pane override beats defaultNewTab");

// Batch: multiple checked rows in view → always tabs, regardless of override.
r = resolveOpenTargets({ selectedPath: "a.md", checkedPaths: ["a.md", "b.md", "c.md"], visiblePaths: ["a.md", "b.md", "c.md"], paneOverride: "split" });
assert.deepEqual(r, { paths: ["a.md", "b.md", "c.md"], target: "tab", isBatch: true }, "batch opens all checked in tabs");

// Batch preserves in-view order and ignores checked paths no longer visible.
r = resolveOpenTargets({ selectedPath: "b.md", checkedPaths: ["c.md", "a.md"], visiblePaths: ["a.md", "b.md", "c.md"] });
assert.deepEqual(r.paths, ["a.md", "c.md"], "batch paths follow visible order, not checked order");

// Stale checked set (none of the checked rows are in view) → fall back to selected.
r = resolveOpenTargets({ selectedPath: "b.md", checkedPaths: ["x.md", "y.md"], visiblePaths: ["a.md", "b.md"] });
assert.deepEqual(r, { paths: ["b.md"], target: null, isBatch: false }, "stale checks fall back to the highlighted row");

// A single checked row still in view is a batch of one — not forced into a tab.
r = resolveOpenTargets({ selectedPath: "a.md", checkedPaths: ["a.md"], visiblePaths: ["a.md"], defaultNewTab: false });
assert.deepEqual(r, { paths: ["a.md"], target: null, isBatch: true }, "one checked row is not force-tabbed");

// No file to open at all.
r = resolveOpenTargets({ selectedPath: null, checkedPaths: [], visiblePaths: [] });
assert.deepEqual(r, { paths: [], target: null, isBatch: false }, "nothing to open");

console.log("activation-intent tests passed");
