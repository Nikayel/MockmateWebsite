/**
 * Client helpers for the Case Lab runs API (`/api/labs/runs`).
 *
 * Thin fetch wrappers used by the sync hook. They attach the Firebase auth
 * token and degrade gracefully (return null) when the user is signed out or the
 * request fails — saving progress should never throw into the UI.
 */

import { getCurrentUserToken } from "@/lib/firebase-lazy"
import type { CaseLabRun } from "@/lib/labs/types"

/**
 * Upper bound on a single runs request. Both the Firebase token lookup and the
 * API round-trip are awaited steps that can hang (unreachable Firebase, a wedged
 * Firestore query). Without a deadline a hung step never settles, and any caller
 * gated on a loading flag — like the resume loader — spins forever. The timeout
 * guarantees the promise always settles, so the UI can fall back or surface an
 * error instead of hanging.
 */
const REQUEST_TIMEOUT_MS = 8000

/** Reject if `promise` hasn't settled within `ms` — bounds an un-abortable await. */
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

/**
 * Fetch the user's in-progress run for a lab (for resume).
 *
 * Bounded by {@link REQUEST_TIMEOUT_MS}: a slow/hung backend rejects (so callers
 * can show a retryable error) rather than leaving the request pending forever. A
 * server that *responds* with an error still degrades to `null` ("no saved run"),
 * matching the best-effort contract — only a true hang surfaces as a throw.
 */
export async function fetchActiveCaseLabRun(caseLabId: string): Promise<CaseLabRun | null> {
  const headers = await withTimeout(authHeaders(), REQUEST_TIMEOUT_MS, "Auth token lookup")
  if (!headers) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`/api/labs/runs?caseLabId=${encodeURIComponent(caseLabId)}`, {
      headers,
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { run: CaseLabRun | null }
    return data.run ?? null
  } finally {
    clearTimeout(timer)
  }
}

/** Upsert a run. Sends only the client-controlled fields; the server owns the rest. */
export async function saveCaseLabRun(run: CaseLabRun): Promise<CaseLabRun | null> {
  const headers = await authHeaders()
  if (!headers) return null
  const payload = {
    id: run.id,
    caseLabId: run.caseLabId,
    mode: run.mode,
    status: run.status,
    currentMilestone: run.currentMilestone,
    answers: run.answers,
    milestoneStatus: run.milestoneStatus,
    ...(run.completedAt ? { completedAt: run.completedAt } : {}),
  }
  const res = await fetch("/api/labs/runs", {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { run: CaseLabRun }
  return data.run ?? null
}

/**
 * Generate interviewer feedback for a run and mark it completed. Returns the
 * updated run (with `answers.review.aiFeedback`), or null on failure.
 */
export async function requestCaseLabFeedback(runId: string): Promise<CaseLabRun | null> {
  const headers = await authHeaders()
  if (!headers) return null
  const res = await fetch("/api/labs/feedback", {
    method: "POST",
    headers,
    body: JSON.stringify({ runId }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { run: CaseLabRun }
  return data.run ?? null
}
