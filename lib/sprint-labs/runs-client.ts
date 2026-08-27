/**
 * Client helpers for the Sprint Labs run + workspace-file APIs
 * (`/api/sprint-labs/runs`, `/api/sprint-labs/runs/files`).
 *
 * Thin fetch wrappers, mirroring `lib/labs/case-lab-runs-client.ts`: attach
 * the Firebase auth token, degrade gracefully (return null) on a signed-out
 * user or a failed request, and bound every request with a timeout so a
 * hung call can't spin a loading state forever.
 *
 * Deliberately does NOT import anything from `./runs` (the server service):
 * that module pulls in `@/lib/firebase-admin`, which must never reach a
 * browser bundle. The two pure helpers this file needs
 * (`reassembleWorkspaceFiles`, `MAX_WORKSPACE_FILES_PER_SAVE`) live in
 * `./workspace-files`, which has no server-only dependencies, and are
 * re-exported here so `components/sprint-labs/useSprintLabRunSync.ts` has a
 * single client-safe import surface, the same way `useCaseLabRunSync` only
 * ever imports from `case-lab-runs-client.ts`.
 */

import { getCurrentUserToken } from "@/lib/firebase-lazy"
import type { SprintLabRun, TicketBoardStatus, WorkspaceFileDoc } from "@/lib/sprint-labs/types"

export { MAX_WORKSPACE_FILES_PER_SAVE, reassembleWorkspaceFiles } from "./workspace-files"
export type { WorkspaceFileLike } from "./workspace-files"

/** The Firestore doc id is server-attached; every client-facing run carries it. */
export type SprintLabRunRecord = SprintLabRun & { id: string }

/**
 * Upper bound on a single request. Both the auth-token lookup and the API
 * round-trip are awaited steps that can hang; without a deadline a hung step
 * never settles, and any caller gated on a loading flag spins forever. Mirrors
 * `case-lab-runs-client.ts`'s `REQUEST_TIMEOUT_MS`.
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

async function fetchJson<T>(
  path: string,
  init: RequestInit,
  headers: Record<string, string>
): Promise<T | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(path, { ...init, headers, signal: controller.signal })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Fetch the user's active run for a workbook (for resume). Null when signed out, none exists, or the request fails/times out. */
export async function fetchActiveSprintLabRun(
  workbookId: string
): Promise<SprintLabRunRecord | null> {
  const headers = await withTimeout(authHeaders(), REQUEST_TIMEOUT_MS, "Auth token lookup")
  if (!headers) return null
  const data = await fetchJson<{ run: SprintLabRunRecord | null }>(
    `/api/sprint-labs/runs?workbookId=${encodeURIComponent(workbookId)}`,
    { method: "GET" },
    headers
  )
  return data?.run ?? null
}

/** Create-or-resume a run for a workbook. See `createSprintLabRun` (server) for the resume semantics. */
export async function startSprintLabRun(input: {
  workbookId: string
  contentVersion: string
  ticketKeys: string[]
}): Promise<SprintLabRunRecord | null> {
  const headers = await authHeaders()
  if (!headers) return null
  const data = await fetchJson<{ run: SprintLabRunRecord }>(
    "/api/sprint-labs/runs",
    { method: "POST", body: JSON.stringify(input) },
    headers
  )
  return data?.run ?? null
}

/** Move one ticket on the board (server-validated transition). */
export async function moveSprintLabRunTicket(input: {
  runId: string
  ticketKey: string
  to: TicketBoardStatus
}): Promise<SprintLabRunRecord | null> {
  const headers = await authHeaders()
  if (!headers) return null
  const data = await fetchJson<{ run: SprintLabRunRecord }>(
    "/api/sprint-labs/runs",
    { method: "PATCH", body: JSON.stringify({ action: "move-ticket", ...input }) },
    headers
  )
  return data?.run ?? null
}

/** Advance to the next sprint. May 403 (Pro required) or 409 (not sequential) — both surface as null here. */
export async function advanceSprintLabRunSprint(input: {
  runId: string
  toSprint: number
  ticketKeys: string[]
}): Promise<SprintLabRunRecord | null> {
  const headers = await authHeaders()
  if (!headers) return null
  const data = await fetchJson<{ run: SprintLabRunRecord }>(
    "/api/sprint-labs/runs",
    { method: "PATCH", body: JSON.stringify({ action: "advance-sprint", ...input }) },
    headers
  )
  return data?.run ?? null
}

/** Fetch the saved workspace-file overlay for a run (not merged with the seed — see `reassembleWorkspaceFiles`). */
export async function fetchSprintLabWorkspaceFiles(
  runId: string
): Promise<WorkspaceFileDoc[] | null> {
  const headers = await withTimeout(authHeaders(), REQUEST_TIMEOUT_MS, "Auth token lookup")
  if (!headers) return null
  const data = await fetchJson<{ files: WorkspaceFileDoc[] }>(
    `/api/sprint-labs/runs/files?runId=${encodeURIComponent(runId)}`,
    { method: "GET" },
    headers
  )
  return data?.files ?? null
}

/** Batched save of changed files (caller must keep each call at or under `MAX_WORKSPACE_FILES_PER_SAVE`). */
export async function saveSprintLabWorkspaceFiles(
  runId: string,
  files: Array<{ path: string; content: string }>
): Promise<WorkspaceFileDoc[] | null> {
  const headers = await authHeaders()
  if (!headers) return null
  const data = await fetchJson<{ files: WorkspaceFileDoc[] }>(
    "/api/sprint-labs/runs/files",
    { method: "PUT", body: JSON.stringify({ runId, files }) },
    headers
  )
  return data?.files ?? null
}
