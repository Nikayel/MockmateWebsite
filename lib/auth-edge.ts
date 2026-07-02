/**
 * Edge-compatible Firebase ID token verification.
 *
 * The Edge runtime cannot load the Firebase Admin SDK (Node-only), so routes
 * that run at the Edge (e.g. /api/feedback/stream) verify tokens by calling the
 * Firebase Identity Toolkit REST API. `accounts:lookup` rejects expired/revoked
 * tokens and returns the account, from which we read the uid (`localId`).
 *
 * This uses only `fetch`, so it is safe in Edge, Node, and Bun runtimes.
 */

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ""

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
      return { authenticated: false, userId: null, error: "Token verification failed" }
    }

    const data = (await response.json()) as { users?: Array<{ localId?: string }> }
    const uid = data.users?.[0]?.localId

    if (!uid) {
      return { authenticated: false, userId: null, error: "Token verification failed" }
    }

    return { authenticated: true, userId: uid }
  } catch {
    return { authenticated: false, userId: null, error: "Token verification failed" }
  }
}
