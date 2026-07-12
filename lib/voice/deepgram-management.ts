/**
 * Deepgram Management API helpers (server-only).
 *
 * Mints short-lived, scope-limited API keys so the browser never receives the
 * long-lived account key. The browser only ever needs to open a streaming
 * transcription socket, which requires the single `usage:write` scope.
 *
 * See https://developers.deepgram.com/reference/create-key
 */

import { logger } from "@/lib/logger"

const DEEPGRAM_API_BASE = "https://api.deepgram.com/v1"

// Ephemeral keys are limited to the one scope needed to open a streaming
// transcription socket, so a leaked key cannot manage keys or read usage.
const EPHEMERAL_KEY_SCOPES = ["usage:write"] as const

// Time-to-live for a minted key. The client caches the key for its page
// session, so this must comfortably cover a session while still auto-expiring.
const EPHEMERAL_KEY_TTL_SECONDS = 60 * 60

// Cache the resolved project id for the process lifetime to avoid an extra
// round trip on every token request.
let cachedProjectId: string | null = null

/**
 * Resolve the Deepgram project id to mint keys under.
 *
 * Prefers the DEEPGRAM_PROJECT_ID env var; otherwise looks it up once via the
 * Management API (requires the key to have a project-read capable scope).
 * Returns null when it cannot be determined.
 */
async function resolveProjectId(managementKey: string): Promise<string | null> {
  if (process.env.DEEPGRAM_PROJECT_ID) return process.env.DEEPGRAM_PROJECT_ID
  if (cachedProjectId) return cachedProjectId

  try {
    const response = await fetch(`${DEEPGRAM_API_BASE}/projects`, {
      headers: { Authorization: `Token ${managementKey}` },
    })
    if (!response.ok) {
      logger.warn("[Deepgram] Failed to list projects for ephemeral key", {
        status: response.status,
      })
      return null
    }
    const data: unknown = await response.json()
    const projects = (data as { projects?: Array<{ project_id?: string }> }).projects
    const projectId = projects?.[0]?.project_id
    if (!projectId) return null
    cachedProjectId = projectId
    return projectId
  } catch (error) {
    logger.warn("[Deepgram] Error resolving project id", { error })
    return null
  }
}

/**
 * Mint a short-lived, usage:write-only Deepgram key for a single client.
 *
 * Returns null when minting is unavailable (management scope missing, project
 * not resolvable, or the API call fails) so the caller can decide how to
 * degrade gracefully.
 */
export async function mintEphemeralDeepgramKey(managementKey: string): Promise<string | null> {
  const projectId = await resolveProjectId(managementKey)
  if (!projectId) return null

  try {
    const response = await fetch(`${DEEPGRAM_API_BASE}/projects/${projectId}/keys`, {
      method: "POST",
      headers: {
        Authorization: `Token ${managementKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: "codesparring-voice-ephemeral",
        scopes: [...EPHEMERAL_KEY_SCOPES],
        time_to_live_in_seconds: EPHEMERAL_KEY_TTL_SECONDS,
      }),
    })

    if (!response.ok) {
      logger.warn("[Deepgram] Failed to mint ephemeral key", { status: response.status })
      return null
    }

    const data: unknown = await response.json()
    const key = (data as { key?: unknown }).key
    return typeof key === "string" && key.length > 0 ? key : null
  } catch (error) {
    logger.warn("[Deepgram] Error minting ephemeral key", { error })
    return null
  }
}
