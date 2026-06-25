/**
 * Client helpers for the Case Lab runs API (`/api/labs/runs`).
 *
 * Thin fetch wrappers used by the sync hook. They attach the Firebase auth
 * token and degrade gracefully (return null) when the user is signed out or the
 * request fails — saving progress should never throw into the UI.
 */

import { getCurrentUserToken } from "@/lib/firebase-lazy"
import type { CaseLabRun } from "@/lib/labs/types"

async function authHeaders(): Promise<Record<string, string> | null> {
  const token = await getCurrentUserToken()
  if (!token) return null
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

/** Fetch the user's in-progress run for a lab (for resume). */
export async function fetchActiveCaseLabRun(caseLabId: string): Promise<CaseLabRun | null> {
  const headers = await authHeaders()
  if (!headers) return null
  const res = await fetch(`/api/labs/runs?caseLabId=${encodeURIComponent(caseLabId)}`, { headers })
  if (!res.ok) return null
  const data = (await res.json()) as { run: CaseLabRun | null }
  return data.run ?? null
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
