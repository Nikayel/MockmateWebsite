/**
 * Revocation-aware ID token verification for the admin surface.
 *
 * `verifyIdToken(token)` only checks the signature and expiry, so revoking an
 * admin (disabling the account, or calling revokeRefreshTokens after an offboard
 * or a leaked laptop) does not take effect until their current ID token expires,
 * about an hour later. `verifyIdToken(token, true)` closes that window, but it
 * costs a round trip to the Firebase Auth backend on every call, and a single
 * admin page view fans out across many API routes. Paying that on each one would
 * add a network hop to every panel on the dashboard.
 *
 * So the check is real but rate-limited per token: the first request with a
 * given token is verified against the Auth backend, and repeats within the
 * window reuse that decision. That turns a page-load fan-out into one revocation
 * check and bounds how long a revoked admin can keep working to the window below
 * rather than to the token's full lifetime.
 *
 * The cache is per-instance and in-memory, which is the right scope: it is an
 * optimisation, and a cold serverless instance simply does the full check.
 */

import { adminAuth } from "../firebase-admin"

/**
 * How long a token may reuse a previous revocation decision. One minute keeps
 * the extra Auth traffic to at most one call per admin per minute while cutting
 * the stale-access window from roughly an hour to roughly a minute.
 */
export const REVOCATION_RECHECK_MS = 60 * 1000

/** token -> epoch ms when it was last checked against the Auth backend. */
const lastCheckedAt = new Map<string, number>()

/** Tokens rotate hourly, so entries must not accumulate for the process lifetime. */
function pruneExpired(now: number): void {
  for (const [token, checkedAt] of lastCheckedAt) {
    if (now - checkedAt > REVOCATION_RECHECK_MS) {
      lastCheckedAt.delete(token)
    }
  }
}

/** Exposed for tests; production code never needs to clear this. */
export function resetRevocationCache(): void {
  lastCheckedAt.clear()
}

/**
 * Verify an ID token, checking revocation at most once per token per window.
 *
 * Throws whatever the Firebase Admin SDK throws, including `auth/id-token-revoked`
 * for a revoked token, so callers keep their existing error handling.
 */
export async function verifyIdTokenWithRevocation(token: string) {
  if (!adminAuth) {
    throw new Error("Auth not initialized")
  }

  const now = Date.now()
  const checkedAt = lastCheckedAt.get(token)
  const shouldCheckRevocation = checkedAt === undefined || now - checkedAt > REVOCATION_RECHECK_MS

  const decoded = await adminAuth.verifyIdToken(token, shouldCheckRevocation)

  if (shouldCheckRevocation) {
    pruneExpired(now)
    lastCheckedAt.set(token, now)
  }

  return decoded
}
