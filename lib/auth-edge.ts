/**
 * Edge-compatible Firebase ID token verification.
 *
 * The Edge runtime cannot load the Firebase Admin SDK (Node-only), so routes
 * that run at the Edge (e.g. /api/feedback/stream) verify tokens by calling the
 * Firebase Identity Toolkit REST API. `accounts:lookup` rejects expired/revoked
 * tokens and returns the account, from which we read the uid (`localId`).
 *
 * This uses only `fetch`, so it is safe in Edge, Node, and Bun runtimes.
 *
 * ## Why failures are logged
 *
 * Every failure path returns the same opaque `"Token verification failed"` to the caller, which is
 * correct: telling an attacker which of "forged", "expired", or "revoked" applies is free
 * information. But it used to be opaque to US as well. A `catch {}` around the fetch meant an
 * Identity Toolkit outage, a DNS failure, or an expired/rotated `NEXT_PUBLIC_FIREBASE_API_KEY`
 * produced mass 401s across every Edge route that were byte-identical to a wave of forged tokens,
 * with no signal anywhere saying which one was happening. That is an outage that looks like an
 * attack, or an attack that looks like an outage, and no way to tell them apart while it is
 * happening.
 *
 * The response body stays opaque. The LOG says what went wrong.
 *
 * `lib/logger` is Edge-safe: it uses `fetch` for delivery and touches `window`/`navigator` only
 * inside guarded branches.
 */
import { logger } from "./logger"

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ""

/**
 * Status codes from `accounts:lookup` that mean "our infrastructure is broken", not "this token is
 * bad". A rejected token is a 400; anything at or above 500 is Google's side failing, and 429 is us
 * being throttled. Both produce user-facing 401s that have nothing to do with the user.
 */
function isUpstreamFailure(status: number): boolean {
  return status >= 500 || status === 429
}

export interface EdgeAuthResult {
  authenticated: boolean
  userId: string | null
  error?: string
}

/**
 * Extract a Bearer token from an Authorization header and verify it against
 * Firebase. Returns the verified uid, or an unauthenticated result.
 */
export async function verifyAuthEdge(request: Request): Promise<EdgeAuthResult> {
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization")

  if (!authHeader?.startsWith("Bearer ")) {
    return { authenticated: false, userId: null, error: "Missing or invalid Authorization header" }
  }

  const idToken = authHeader.slice("Bearer ".length).trim()
  if (!idToken) {
    return { authenticated: false, userId: null, error: "No token provided" }
  }

  if (!FIREBASE_API_KEY) {
    // Fail-closed and loud: with no key EVERY Edge request 401s, and the cause is a deploy
    // configuration mistake that no amount of staring at request logs would reveal.
    logger.error("Edge auth is unconfigured: NEXT_PUBLIC_FIREBASE_API_KEY is missing", {
      endpoint: "verifyAuthEdge",
    })
    return { authenticated: false, userId: null, error: "Auth is not configured" }
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    )

    if (!response.ok) {
      // A 400 here is the normal, expected rejection of a bad token and would drown the logs. Only
      // the codes that mean Google is failing or throttling us are worth an alert.
      if (isUpstreamFailure(response.status)) {
        logger.error("Firebase Identity Toolkit rejected a token-verification request", {
          endpoint: "verifyAuthEdge",
          statusCode: response.status,
        })
      }
      return { authenticated: false, userId: null, error: "Token verification failed" }
    }

    const data = (await response.json()) as { users?: Array<{ localId?: string }> }
    const uid = data.users?.[0]?.localId

    if (!uid) {
      // A 200 with no account attached is not a normal rejection. It means the response shape
      // changed or the account vanished mid-request, and it would otherwise be indistinguishable
      // from a forged token.
      logger.warn("Token verification returned 200 with no account", {
        endpoint: "verifyAuthEdge",
      })
      return { authenticated: false, userId: null, error: "Token verification failed" }
    }

    return { authenticated: true, userId: uid }
  } catch (error) {
    // Never reached by a bad token: `accounts:lookup` answers 400 for those and the branch above
    // handles it. Reaching here means the request never completed - DNS, TLS, a network partition,
    // or a runtime abort - so every Edge route is 401ing for reasons no user caused.
    logger.error("Token verification could not reach Firebase", {
      endpoint: "verifyAuthEdge",
      error,
    })
    return { authenticated: false, userId: null, error: "Token verification failed" }
  }
}
