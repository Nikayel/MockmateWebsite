/**
 * Client-side fetch wrappers for System-Design saved answers. Mirrors `progress-client.ts`: attach
 * the Firebase auth token, bound reads with a timeout, and degrade to a safe empty value (null / [])
 * when signed out or on a non-ok response — saved answers are best-effort, never blocking.
 *
 * `DesignAnswerInput` is imported type-only, so this client module carries no runtime dependency on
 * the Admin-SDK-backed `./design-answers` service.
 */
import { REQUEST_TIMEOUT_MS, withTimeout, authHeaders } from "./learn-api-client"
import type { DesignAnswer, DesignAnswerInput } from "./design-answers"

const ENDPOINT = "/api/tutorials/design-answers"

/**
 * One exercise's saved answer (player resume). Null when signed out or on a genuine 200 with no saved
 * answer; THROWS on a real load failure so the player can keep the editor gated instead of treating a
 * failed read as "no answer yet".
 */
export async function fetchDesignAnswer(exerciseId: string): Promise<DesignAnswer | null> {
  const headers = await withTimeout(authHeaders(), REQUEST_TIMEOUT_MS, "Auth token lookup")
  if (!headers) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${ENDPOINT}?exerciseId=${encodeURIComponent(exerciseId)}`, {
      headers,
      signal: controller.signal,
    })
    // Distinguish a real load FAILURE from "no saved answer yet": throw on non-ok so the player keeps the
    // design editor gated and never offers Save against an unread server doc; reserve null for a genuine
    // 200 with `answer: null` (or signed-out above). (Mirrors progress-client Audit #4.)
    if (!res.ok) throw new Error(`Design answer load failed with status ${res.status}`)
    const data = (await res.json()) as { answer: DesignAnswer | null }
    return data.answer ?? null
  } finally {
    clearTimeout(timer)
  }
}

/** All of the user's saved answers. Empty when signed out or on failure. */
export async function fetchAllDesignAnswers(): Promise<DesignAnswer[]> {
  const headers = await withTimeout(authHeaders(), REQUEST_TIMEOUT_MS, "Auth token lookup")
  if (!headers) return []

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, { headers, signal: controller.signal })
    if (!res.ok) return []
    const data = (await res.json()) as { items: DesignAnswer[] }
    return data.items ?? []
  } finally {
    clearTimeout(timer)
  }
}

/** Upsert one exercise's saved answer. Null when signed out or on a non-ok response. */
export async function saveDesignAnswer(input: DesignAnswerInput): Promise<DesignAnswer | null> {
  const headers = await authHeaders()
  if (!headers) return null
  const res = await fetch(ENDPOINT, {
    method: "PUT",
    headers,
    body: JSON.stringify(input),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { answer: DesignAnswer }
  return data.answer ?? null
}
