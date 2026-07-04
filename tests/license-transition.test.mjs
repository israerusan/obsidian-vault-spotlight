import assert from "assert";
import { resolveLicenseTransition } from "../src/core/licenseTransition.mjs";

// No key, already free: a true no-op — must NOT persist (don't churn data.json)
// unless the caller forces it, and never flips/syncs.
let t = resolveLicenseTransition({ isPro: false, email: "" }, "", null, false);
assert.deepEqual(t, { isPro: false, email: "", changed: false, persist: false, flipped: false, syncCommands: false }, "free + no key + no force = no-op");

t = resolveLicenseTransition({ isPro: false, email: "" }, "", null, true);
assert.equal(t.persist, true, "persistUnchanged forces a save even when nothing changed");
assert.equal(t.changed, false, "forced save does not report a logical change");
assert.equal(t.syncCommands, false, "forced save on unchanged state does not resync commands");

// No key, was Pro: lapse → free, must persist, flip, and revoke Pro commands.
t = resolveLicenseTransition({ isPro: true, email: "a@b.com" }, "", null, false);
assert.deepEqual(t, { isPro: false, email: "", changed: true, persist: true, flipped: true, syncCommands: true }, "lapsed license drops to free and revokes commands");

// No key, not Pro but a stale email lingers: clear it (persist) without flipping.
t = resolveLicenseTransition({ isPro: false, email: "old@b.com" }, "", null, false);
assert.equal(t.email, "", "stale email is cleared");
assert.equal(t.persist, true, "clearing a stale email persists");
assert.equal(t.flipped, false, "clearing an email is not a pro flip");
assert.equal(t.syncCommands, false, "clearing an email does not resync commands");

// Valid key from free: flip on, persist, sync.
t = resolveLicenseTransition({ isPro: false, email: "" }, "KEY", { valid: true, email: "buyer@x.com" }, false);
assert.deepEqual(t, { isPro: true, email: "buyer@x.com", changed: true, persist: true, flipped: true, syncCommands: true }, "valid key unlocks Pro");

// Re-verifying the SAME valid key: no change → don't persist unless forced.
t = resolveLicenseTransition({ isPro: true, email: "buyer@x.com" }, "KEY", { valid: true, email: "buyer@x.com" }, false);
assert.equal(t.changed, false, "re-verifying an unchanged valid key is not a change");
assert.equal(t.persist, false, "unchanged re-verify does not churn data.json");
assert.equal(t.syncCommands, false, "unchanged re-verify does not resync commands");

// Email-only change (still Pro): changed + persist, but NOT a flip/sync.
t = resolveLicenseTransition({ isPro: true, email: "old@x.com" }, "KEY", { valid: true, email: "new@x.com" }, false);
assert.equal(t.changed, true, "email change counts as a change");
assert.equal(t.persist, true, "email change persists");
assert.equal(t.flipped, false, "email change is not a pro flip");
assert.equal(t.syncCommands, false, "email change does not resync commands");

// Invalid/typo'd key while Pro: revoke.
t = resolveLicenseTransition({ isPro: true, email: "b@x.com" }, "BAD", { valid: false }, false);
assert.deepEqual(t, { isPro: false, email: "", changed: true, persist: true, flipped: true, syncCommands: true }, "invalid key revokes Pro");

console.log("license-transition tests passed");
