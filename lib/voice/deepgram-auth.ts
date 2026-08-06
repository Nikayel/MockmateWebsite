/**
 * Deepgram browser-auth helpers (server-only).
 *
 * Grants short-lived JWTs so the browser never receives the long-lived account
 * key. This replaces the older approach of minting a real API key per request
 * through the Management API: that needed the `keys:write` scope, an extra
 * `/projects` round trip, and left key objects in the project until they aged
 * out. A granted token needs only Member permission on the account key and
 * creates nothing that has to be cleaned up.
 *
 * See https://developers.deepgram.com/reference/auth/tokens/grant
 */

import { logger } from "@/lib/logger"

const DEEPGRAM_GRANT_URL = "https://api.deepgram.com/v1/auth/grant"

// The token only has to survive the WebSocket upgrade: once the socket is open,
// Deepgram does not close it when the token expires. Deepgram defaults to 30s,
// which is tight if the user is still sitting on the mic-permission prompt, so
// ask for five minutes. The client grants a fresh token per connection anyway.
const ACCESS_TOKEN_TTL_SECONDS = 300

export interface DeepgramAccessToken {
  accessToken: string
  expiresIn: number
}

/**
 * Grant a short-lived Deepgram access token for a single client connection.
 *
 * Returns null when the grant fails (insufficient permission, network error, or
 * an unexpected response shape) so the caller can decide how to degrade.
 */
export async function grantDeepgramAccessToken(
  accountKey: string
): Promise<DeepgramAccessToken | null> {
  try {
    const response = await fetch(DEEPGRAM_GRANT_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${accountKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: ACCESS_TOKEN_TTL_SECONDS }),
    })

    if (!response.ok) {
      logger.warn("[Deepgram] Failed to grant access token", { status: response.status })
      return null
    }

    const data: unknown = await response.json()
    const { access_token: accessToken, expires_in: expiresIn } = data as {
      access_token?: unknown
      expires_in?: unknown
    }

    if (typeof accessToken !== "string" || accessToken.length === 0) {
      logger.warn("[Deepgram] Grant response contained no access_token")
      return null
    }

    return {
      accessToken,
      expiresIn: typeof expiresIn === "number" ? expiresIn : ACCESS_TOKEN_TTL_SECONDS,
    }
  } catch (error) {
    logger.warn("[Deepgram] Error granting access token", { error })
    return null
  }
}
