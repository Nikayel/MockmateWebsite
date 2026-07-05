/**
 * Client-side fetch wrappers for System-Design saved answers. Mirrors `progress-client.ts`: attach
 * the Firebase auth token, bound reads with a timeout, and degrade to a safe empty value (null / [])
 * when signed out or on a non-ok response — saved answers are best-effort, never blocking.
 *
 * `DesignAnswerInput` is imported type-only, so this client module carries no runtime dependency on
 * the Admin-SDK-backed `./design-answers` service.
 */
import { getCurrentUserToken } from "@/lib/firebase-lazy"
import type { DesignAnswer, DesignAnswerInput } from "./design-answers"

const REQUEST_TIMEOUT_MS = 8000
const ENDPOINT = "/api/tutorials/design-answers"

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
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

/** One exercise's saved answer (player resume). Null when signed out, missing, or on failure. */
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
    if (!res.ok) return null
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
