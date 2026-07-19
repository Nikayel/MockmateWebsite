/**
 * Client-side fetch wrappers for tutorial progress. Mirrors `lib/labs/case-lab-runs-client.ts`:
 * attach the Firebase auth token, bound reads with a timeout, and degrade to a safe empty value
 * (null / []) when signed out or on a non-ok response — progress is best-effort, never blocking.
 *
 * `TutorialProgressInput` is imported type-only, so this client module carries no runtime
 * dependency on the Admin-SDK-backed `./progress` service.
 */
import { REQUEST_TIMEOUT_MS, withTimeout, authHeaders } from "./learn-api-client"
import type { TutorialLessonProgress } from "./types"
import type { TutorialProgressInput } from "./progress"

const ENDPOINT = "/api/tutorials/progress"

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
    // Distinguish a real load FAILURE from "no saved progress yet": throw on non-ok so the resume hook
    // keeps autosave gated and never clobbers an unread server doc; reserve null for a genuine 200 with
    // `progress: null` (or signed-out above). (Audit #4.)
    if (!res.ok) throw new Error(`Progress load failed with status ${res.status}`)
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
