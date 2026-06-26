import assert from "assert";
import fs from "fs";
import path from "path";
import nacl from "tweetnacl";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicKeyTs = fs.readFileSync(path.join(root, "src/license/publicKey.ts"), "utf8");
const match = publicKeyTs.match(/"([^"]+)"/);
assert.ok(match, "public key should exist");

function fromBase64(value) {
	const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
	const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
	return new Uint8Array(Buffer.from(padded, "base64"));
}

const output = execSync("node scripts/generate-license.mjs test@example.com", { cwd: root, encoding: "utf8" });
const keyLine = output.split("\n").find((l) => l.startsWith("Key:"));
assert.ok(keyLine, "license generator should print key");
const licenseKey = keyLine.replace("Key:", "").trim();
const [payloadB64, sigB64] = licenseKey.split(".");
assert.equal(licenseKey.split(".").length, 2);

const payloadBytes = fromBase64(payloadB64);
const signature = fromBase64(sigB64);
const publicKey = fromBase64(match[1]);
assert.ok(nacl.sign.detached.verify(payloadBytes, signature, publicKey));

const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
assert.equal(payload.product, "vault-spotlight");
assert.equal(payload.email, "test@example.com");

console.log("license tests passed");