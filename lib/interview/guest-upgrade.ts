/**
 * Transfers a completed guest session to the account that was just created
 * from the post-trial signup prompt.
 *
 * Ordering contract: this must resolve BEFORE feedback streaming starts.
 * /api/feedback/stream generates paid AI output and its persist step
 * (/api/feedback/persist) refuses to write to a session the caller does not
 * own, so streaming first would burn the AI call and save nothing. Callers
 * rely on the throw to stop that.
 */
export async function upgradeGuestSession(params: {
  guestId: string
  sessionId: string
  idToken: string
}): Promise<void> {
  const response = await fetch("/api/guest-session/migrate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.idToken}`,
    },
    body: JSON.stringify({ guestId: params.guestId, sessionId: params.sessionId }),
  })

  const result = (await response.json().catch(() => null)) as {
    migrated?: number
    error?: string
  } | null

  if (!response.ok) {
    throw new Error(result?.error || `Guest session migration failed (${response.status})`)
  }
  if (!result || !result.migrated || result.migrated < 1) {
    throw new Error("Guest session migration reported nothing migrated")
  }
}
