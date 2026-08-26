/**
 * Login-side guest session migration.
 *
 * Owns the whole lifecycle of the `pending_guest_migration` marker so the
 * login page cannot get the ordering wrong again (it once cleared the local
 * session data one line before reading it, and destroyed the retry marker in
 * a finally block that ran on network blips too). The rules:
 *
 * - migrated: the server confirmed ownership moved. Guest identity and the
 *   marker are retired, and the session id comes from the SERVER response.
 * - gone: the server answered and there is nothing to recover (404 or
 *   migrated: 0). Retrying can never succeed, so the marker goes too.
 * - transient: the server never answered properly (network failure, 5xx).
 *   The marker survives so the next sign-in retries; the migrate endpoint is
 *   idempotent, so a retry after a lost success is safe.
 * - none: there was no guest identity to migrate at all.
 */

import { confirmGuestSessionMigration, getGuestId } from "./guest-session"

const PENDING_MIGRATION_KEY = "pending_guest_migration"

export type LoginMigrationResult =
  | { status: "migrated"; sessionId: string | null }
  | { status: "none" }
  | { status: "gone" }
  | { status: "transient" }

/** Whether a prior surface (SignupPrompt, the guest banner) promised this
 *  visitor that signing in recovers a specific trial session. */
export function hasPendingGuestMigration(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(PENDING_MIGRATION_KEY) !== null
}

export async function migrateGuestSessionsOnLogin(params: {
  idToken: string
}): Promise<LoginMigrationResult> {
  if (typeof window === "undefined") return { status: "none" }

  const raw = localStorage.getItem(PENDING_MIGRATION_KEY)
  let markerGuestId: string | null = null
  let markerSessionId: string | null = null
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { guestId?: string; sessionId?: string }
      markerGuestId = parsed.guestId ?? null
      markerSessionId = parsed.sessionId ?? null
    } catch {
      // Unreadable marker: fall through to the stored guest id.
    }
  }

  const guestId = markerGuestId ?? getGuestId()
  if (!guestId) {
    // A marker without any guest identity can never succeed.
    localStorage.removeItem(PENDING_MIGRATION_KEY)
    return { status: "none" }
  }

  let response: Response
  try {
    response = await fetch("/api/guest-session/migrate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.idToken}`,
      },
      body: JSON.stringify({ guestId, sessionId: markerSessionId }),
    })
  } catch {
    return { status: "transient" }
  }

  const result = (await response.json().catch(() => null)) as {
    migrated?: number
    sessionIds?: string[]
  } | null

  if (response.ok && result && (result.migrated ?? 0) > 0) {
    confirmGuestSessionMigration()
    localStorage.removeItem(PENDING_MIGRATION_KEY)
    return { status: "migrated", sessionId: result.sessionIds?.[0] ?? markerSessionId ?? null }
  }

  if (response.status === 404 || (response.ok && result && result.migrated === 0)) {
    // Nothing recoverable exists, so the guest identity retires with the
    // marker: keeping it would make every future login POST a pointless
    // migrate. The trial-used flag survives (confirm never touches it).
    confirmGuestSessionMigration()
    localStorage.removeItem(PENDING_MIGRATION_KEY)
    return { status: "gone" }
  }

  return { status: "transient" }
}
