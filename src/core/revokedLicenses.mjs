/**
 * Revoked license keys.
 *
 * WHY THIS EXISTS: `tests/fixtures/test-license.key` used to hold a real, production-signed
 * `vault-spotlight` Pro license — minted with the real private key, verifying against the
 * public key shipped in every release — and this repository is public. Anyone who opened
 * that file on GitHub could paste the string into the plugin and have Pro for free, forever.
 *
 * The obvious fix, rotating the keypair, would have revoked Pro for every PAYING CUSTOMER,
 * because their keys are signed by that same private key. So the keypair is UNCHANGED and
 * this one leaked token is denied by value instead. Every real customer key keeps working;
 * the copies scraped from GitHub stop working the moment the user updates.
 *
 * The fixture has been re-minted under the product id `vault-spotlight-test`, which the
 * plugin never asks for, so it is inert twice over — denied here, and rejected by the
 * verifier's product check even if it were not.
 *
 * Publishing the revoked key here is safe and deliberate: it is already public, and it has
 * to be compared by value. Hashing it would hide nothing from anyone.
 */

/** @type {ReadonlySet<string>} */
export const REVOKED_LICENSE_KEYS = new Set([
	// Leaked via tests/fixtures/test-license.key. Payload:
	// {"product":"vault-spotlight","email":"test@example.com","issued":"2026-06-29T13:52:09.905Z"}
	"eyJwcm9kdWN0IjoidmF1bHQtc3BvdGxpZ2h0IiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaXNzdWVkIjoiMjAyNi0wNi0yOVQxMzo1MjowOS45MDVaIn0.yQEF2JRlX2213N0OejZQ1zgx2vgayHDQDUpWnUzfWZU1MANRJp_bMIa1g63AB15-FR98YpG80M0Ne4uzhwwQAQ",
]);

/** True when a key has been revoked. Whitespace-tolerant, because users paste. */
export function isRevoked(licenseKey) {
	return REVOKED_LICENSE_KEYS.has(String(licenseKey ?? "").trim());
}
