// The committed fixture must NEVER be a working key for the shipped product.
//
// It used to be exactly that: a real, production-signed `vault-spotlight` license, minted
// with the real private key, verifying against the public key in every release — in a PUBLIC
// repository. Anyone could copy it out of GitHub and unlock Pro forever.
//
// The keypair was NOT rotated (that would have revoked Pro for every paying customer). The
// leaked token is denied by value in src/license/revoked.ts, and the fixture re-minted under
// a product id the plugin never requests. It still proves the bundled public key pairs with
// the signing key — so the public key can never be swapped without this test going red —
// while unlocking nothing.
import assert from "assert";
import fs from "fs";
import path from "path";
import nacl from "tweetnacl";
import { fileURLToPath } from "url";
import { verifyLicense } from "../src/shared/verifyLicense.mjs";
import { isRevoked, REVOKED_LICENSE_KEYS } from "../src/core/revokedLicenses.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const publicKeyTs = fs.readFileSync(path.join(root, "src/license/publicKey.ts"), "utf8");
const match = publicKeyTs.match(/"([^"]+)"/);
assert.ok(match, "public key should exist");
const publicKeyB64 = match[1];

function fromBase64(value) {
	const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
	const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
	return new Uint8Array(Buffer.from(padded, "base64"));
}

const licenseKey = fs
	.readFileSync(path.join(__dirname, "fixtures", "test-license.key"), "utf8")
	.trim();
const [payloadB64, sigB64] = licenseKey.split(".");
assert.equal(licenseKey.split(".").length, 2);

// The fixture is still signed by the real private key — that is its whole job.
assert.ok(
	nacl.sign.detached.verify(fromBase64(payloadB64), fromBase64(sigB64), fromBase64(publicKeyB64)),
	"the bundled public key must still pair with the signing key"
);

const payload = JSON.parse(new TextDecoder().decode(fromBase64(payloadB64)));
assert.equal(payload.email, "test@example.com");

// THE ONE THAT MATTERS: it must not be a key for the shipped product.
assert.notEqual(
	payload.product,
	"vault-spotlight",
	"SECURITY: the committed fixture is a WORKING vault-spotlight license. This repo is public — " +
		"anyone can copy it and unlock Pro. Re-mint it under a product id the plugin never requests."
);
assert.equal(payload.product, "vault-spotlight-test");
assert.equal(
	verifyLicense(licenseKey, "vault-spotlight", publicKeyB64).valid,
	false,
	"the committed fixture must not verify against the shipped product"
);

// The leaked key, which is already out in the world, must be dead.
const leaked = [...REVOKED_LICENSE_KEYS][0];
assert.ok(leaked, "the leaked key must stay in the revocation list");
assert.equal(
	verifyLicense(leaked, "vault-spotlight", publicKeyB64).valid,
	true,
	"sanity: the leaked key IS a validly signed vault-spotlight license — which is the whole problem"
);

console.log("license tests passed");

// The revocation gate itself.
assert.equal(isRevoked(leaked), true, "the leaked key must be revoked");
assert.equal(isRevoked(`  ${leaked}\n`), true, "users paste; whitespace must not defeat revocation");
assert.equal(isRevoked(licenseKey), false, "the re-minted fixture is not revoked, it is simply not our product");
assert.equal(isRevoked(""), false);
