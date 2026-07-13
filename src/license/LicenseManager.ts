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
		const trimmed = String(licenseKey ?? "").trim();
		if (isRevoked(trimmed)) {
			return { valid: false, error: "This license key has been revoked." };
		}
		return verifyLicense(trimmed, LicenseManager.PRODUCT, LICENSE_PUBLIC_KEY);
	}
}
