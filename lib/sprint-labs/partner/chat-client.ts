/**
 * Client helpers for `/api/sprint-labs/chat` (PLAN.md Task 14). Thin fetch
 * wrappers, mirroring `lib/sprint-labs/runs-client.ts`'s conventions: attach
 * the Firebase auth token, degrade gracefully on a signed-out user or a
 * failed request, and bound every request with a timeout so a hung call
 * cannot spin a loading state forever. `PartnerChat.tsx` is the primary
 * caller; a future task assembling `AgentKnowledgePanel` into the workspace
 * screen can reuse `fetchPartnerTranscript`/`setDirectiveMuted` too.
 */

import { getCurrentUserToken } from "@/lib/firebase-lazy"
import type { SprintLabTranscript, SprintLabTranscriptMessage } from "@/lib/sprint-labs/types"
import type { LayerBInput } from "./context-layers"

const REQUEST_TIMEOUT_MS = 20_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

async function authHeaders(): Promise<Record<string, string> | null> {
  const token = await getCurrentUserToken()
  if (!token) return null
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
}

export interface SendPartnerChatMessageInput {
  runId: string
  ticketKey: string
  message: string
  turnIndex: number
  mode: "partner" | "tutor"
  layerB?: LayerBInput
  files?: Array<{ path: string; content: string }>
}

export type SendPartnerChatMessageResult =
  | { ok: true; reply: string }
  /** The resolved mode was "none" -- no session on this ticket; render the locked card with `reason`. */
  | { ok: false; locked: true; reason: string }
  | { ok: false; locked: false; error: string }

/** Send one chat turn. Never throws -- every failure mode is a tagged result the caller branches on. */
export async function sendPartnerChatMessage(
  input: SendPartnerChatMessageInput
): Promise<SendPartnerChatMessageResult> {
  const headers = await authHeaders()
  if (!headers) return { ok: false, locked: false, error: "Please sign in to chat with Sable." }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch("/api/sprint-labs/chat", {
      method: "POST",
      headers,
      body: JSON.stringify(input),
      signal: controller.signal,
    })
    const data = (await res.json().catch(() => ({}))) as {
      reply?: string
      reason?: string
      error?: string
    }
    if (res.status === 403 && typeof data.reason === "string") {
      return { ok: false, locked: true, reason: data.reason }
    }
    if (!res.ok || typeof data.reply !== "string") {
      return { ok: false, locked: false, error: data.error ?? "Couldn't reach Sable. Try again." }
    }
    return { ok: true, reply: data.reply }
  } catch {
    return { ok: false, locked: false, error: "Couldn't reach Sable. Try again." }
  } finally {
    clearTimeout(timer)
  }
}

export interface PartnerTranscriptState {
  transcript: SprintLabTranscript
  mutedDirectiveIds: string[]
}

/** Rehydrate the learner's transcript + directive mutes on mount. Null on any failure (signed out, network, not found). */
export async function fetchPartnerTranscript(
  runId: string,
  ticketKey: string
): Promise<PartnerTranscriptState | null> {
  const headers = await authHeaders()
  if (!headers) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(
      `/api/sprint-labs/chat?runId=${encodeURIComponent(runId)}&ticketKey=${encodeURIComponent(ticketKey)}`,
      { method: "GET", headers, signal: controller.signal }
    )
    if (!res.ok) return null
    return (await res.json()) as PartnerTranscriptState
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Toggle one directive's mute state. Returns the updated mute list, or null on failure. */
export async function setDirectiveMuted(
  runId: string,
  ticketKey: string,
  directiveId: string,
  muted: boolean
): Promise<string[] | null> {
  const headers = await withTimeout(authHeaders(), REQUEST_TIMEOUT_MS, "Auth token lookup").catch(
    () => null
  )
  if (!headers) return null

  try {
    const res = await fetch("/api/sprint-labs/chat", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action: "mute-directive", runId, ticketKey, directiveId, muted }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { mutedDirectiveIds: string[] }
    return data.mutedDirectiveIds
  } catch {
    return null
  }
}

export type { SprintLabTranscriptMessage }
