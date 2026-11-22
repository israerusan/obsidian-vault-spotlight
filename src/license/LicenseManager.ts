import { verifyLicense, type LicenseVerification } from "../shared/verifyLicense.mjs";
import { isRevoked } from "../core/revokedLicenses.mjs";
import { LICENSE_PUBLIC_KEY } from "./publicKey";

export type { LicensePayload, LicenseVerification } from "../shared/verifyLicense.mjs";

/**
 * Thin product binding over the shared verifier (src/shared/verifyLicense.mjs, vendored from
 * obsidian-plugin-core — edit it there, not here).
 *
 * The revocation check runs BEFORE the signature check, so a denied key can never be reported
 * as valid no matter how the verifier behaves. See core/revokedLicenses.mjs for why one has
 * to exist at all.
 */
export class LicenseManager {
	private static readonly PRODUCT = "vault-spotlight";

	static verify(licenseKey: string): LicenseVerification {
		// Strip ALL whitespace, not just the ends: keys are URL-safe base64
		// (`payload.signature`), which never contains whitespace, so a space or line
		// break a mail client wrapped into a pasted key can only be noise. The
		// revocation check sees the same normalized value.
		const trimmed = String(licenseKey ?? "").replace(/\s+/g, "");
		if (isRevoked(trimmed)) {
			return { valid: false, error: "This license key has been revoked." };
		}
		return verifyLicense(trimmed, LicenseManager.PRODUCT, LICENSE_PUBLIC_KEY);
	}
}
