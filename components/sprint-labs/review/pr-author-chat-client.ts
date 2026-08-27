/**
 * A single push-back exchange with the review-only ticket's PR-author agent
 * (UX-SPEC.md §9: "pushing back opens a short exchange with the PR-author
 * agent, which concedes only on an authored concession_triggers fact and
 * otherwise holds its position").
 *
 * This is real, not a stub: `POST /api/sprint-labs/chat` already resolves to
 * `author-agent` mode server-side for a review-only ticket
 * (`resolvePartnerModeForTicket`, matched against the sealed
 * `concessionTriggers` — see `app/api/sprint-labs/chat/route.ts`), so posting
 * the learner's push-back reason there gets a genuine, policy-correct reply.
 * Scoped deliberately to ONE reply per push-back (not a full multi-turn
 * panel): §1.8's NEW component index names `SableChatPanel` only for screen
 * 6 (workspace); no chat panel is named for screen 8, so this stays an
 * inline exchange embedded in `ReviewCommentCard`, not a second chat surface.
 */

import { getCurrentUserToken } from "@/lib/firebase-lazy"

const REQUEST_TIMEOUT_MS = 20000

export async function sendPushbackToAuthorAgent(input: {
  runId: string
  ticketKey: string
  message: string
  turnIndex: number
}): Promise<string | null> {
  const token = await getCurrentUserToken()
  if (!token) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch("/api/sprint-labs/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...input, mode: "partner" }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { reply?: string }
    return typeof data.reply === "string" ? data.reply : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
