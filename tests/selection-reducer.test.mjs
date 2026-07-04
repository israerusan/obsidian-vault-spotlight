import assert from "assert";
import { clampIndex, nextSelectedIndex } from "../src/core/selectionReducer.mjs";

// --- clampIndex -------------------------------------------------------------
assert.equal(clampIndex(5, 10), 5, "in-range index is unchanged");
assert.equal(clampIndex(-3, 10), 0, "negative clamps to 0");
assert.equal(clampIndex(99, 10), 9, "past-end clamps to last");
assert.equal(clampIndex(0, 0), 0, "empty list clamps to 0");
assert.equal(clampIndex(4, 0), 0, "empty list ignores the index");

// --- move (arrows / Ctrl+N/P) ----------------------------------------------
assert.equal(nextSelectedIndex(0, 5, { type: "move", delta: 1 }), 1, "down moves one");
assert.equal(nextSelectedIndex(4, 5, { type: "move", delta: 1 }), 4, "down clamps at last (no wrap)");
assert.equal(nextSelectedIndex(0, 5, { type: "move", delta: -1 }), 0, "up clamps at first (no wrap)");
assert.equal(nextSelectedIndex(3, 5, { type: "move", delta: -2 }), 1, "multi-step move");

// --- first / last (Home / End) ---------------------------------------------
assert.equal(nextSelectedIndex(3, 5, { type: "first" }), 0, "Home jumps to 0");
assert.equal(nextSelectedIndex(1, 5, { type: "last" }), 4, "End jumps to last");
assert.equal(nextSelectedIndex(3, 0, { type: "last" }), 0, "End on empty list is 0");

// --- page (PageUp / PageDown) ----------------------------------------------
assert.equal(nextSelectedIndex(0, 100, { type: "page", delta: 1, pageSize: 8 }), 8, "PageDown jumps a page");
assert.equal(nextSelectedIndex(95, 100, { type: "page", delta: 1, pageSize: 8 }), 99, "PageDown clamps at last");
assert.equal(nextSelectedIndex(3, 100, { type: "page", delta: -1, pageSize: 8 }), 0, "PageUp clamps at first");
assert.equal(nextSelectedIndex(0, 100, { type: "page", delta: 1, pageSize: 0 }), 1, "a zero page size still advances by one");

console.log("selection-reducer tests passed");
