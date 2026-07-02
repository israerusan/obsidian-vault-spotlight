import { verifyLicense, type LicenseVerification } from "../shared/verifyLicense.mjs";
import { LICENSE_PUBLIC_KEY } from "./publicKey";

export type { LicensePayload, LicenseVerification } from "../shared/verifyLicense.mjs";

/**
 * Thin product binding over the shared verifier (src/shared/verifyLicense.ts,
 * vendored from obsidian-plugin-core — edit it there, not here).
 */
export class LicenseManager {
	private static readonly PRODUCT = "vault-spotlight";

	static verify(licenseKey: string): LicenseVerification {
		return verifyLicense(licenseKey, LicenseManager.PRODUCT, LICENSE_PUBLIC_KEY);
	}
}
