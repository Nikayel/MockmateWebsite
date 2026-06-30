/**
 * Client-side fetch wrappers for tutorial progress. Mirrors `lib/labs/case-lab-runs-client.ts`:
 * attach the Firebase auth token, bound reads with a timeout, and degrade to a safe empty value
 * (null / []) when signed out or on a non-ok response — progress is best-effort, never blocking.
 *
 * `TutorialProgressInput` is imported type-only, so this client module carries no runtime
 * dependency on the Admin-SDK-backed `./progress` service.
 */
import { getCurrentUserToken } from "@/lib/firebase-lazy"
import type { TutorialLessonProgress } from "./types"
import type { TutorialProgressInput } from "./progress"

const REQUEST_TIMEOUT_MS = 8000
const ENDPOINT = "/api/tutorials/progress"

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

/** One lesson's progress (player resume). Null when signed out, missing, or on failure. */
export async function fetchLessonProgress(
  lessonId: string
): Promise<TutorialLessonProgress | null> {
  const headers = await withTimeout(authHeaders(), REQUEST_TIMEOUT_MS, "Auth token lookup")
  if (!headers) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${ENDPOINT}?lessonId=${encodeURIComponent(lessonId)}`, {
      headers,
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { progress: TutorialLessonProgress | null }
    return data.progress ?? null
  } finally {
    clearTimeout(timer)
  }
}

/** All of the user's progress (level/dashboard overlay). Empty when signed out or on failure. */
export async function fetchAllProgress(): Promise<TutorialLessonProgress[]> {
  const headers = await withTimeout(authHeaders(), REQUEST_TIMEOUT_MS, "Auth token lookup")
  if (!headers) return []

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, { headers, signal: controller.signal })
    if (!res.ok) return []
    const data = (await res.json()) as { items: TutorialLessonProgress[] }
    return data.items ?? []
  } finally {
    clearTimeout(timer)
  }
}

/** Upsert one lesson's progress. Null when signed out or on a non-ok response. */
export async function saveLessonProgress(
  input: TutorialProgressInput
): Promise<TutorialLessonProgress | null> {
  const headers = await authHeaders()
  if (!headers) return null
  const res = await fetch(ENDPOINT, {
    method: "PUT",
    headers,
    body: JSON.stringify(input),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { progress: TutorialLessonProgress }
  return data.progress ?? null
}
