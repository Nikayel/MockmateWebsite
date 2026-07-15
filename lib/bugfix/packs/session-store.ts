/**
 * Server-authoritative persistence for pack interview progress (PLAN.md Sprint 1
 * item 3 persistence; INTERVIEWER_SPEC.md "State is persisted server-side per session
 * ... never trusted from the client").
 *
 * Progress lives on `interview_sessions/{sessionId}.session_state.pack_progress`, the
 * same slot guided-lab progress uses. Every read/write is scoped to the verified owner
 * (`data.user_id === userId`); the machine (machine.ts) is the only thing that mutates
 * a `PackProgress`, so the client can never fast-forward the session.
 */

import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  advancePackState,
  initPackProgress,
  PACK_STATES,
  type PackInput,
  type PackProgress,
  type PackState,
  type PackTransitionResult,
} from "./machine"

/** Validate an untrusted stored value into a PackProgress, or null if it is malformed. */
export function normalizePackProgress(raw: unknown): PackProgress | null {
  if (!raw || typeof raw !== "object") return null
  const value = raw as Record<string, unknown>
  if (value.version !== 1) return null
  if (typeof value.state !== "string" || !PACK_STATES.includes(value.state as PackState)) {
    return null
  }
  const hintLevel = typeof value.hintLevel === "number" ? value.hintLevel : 0
  const nonAdvancingTurns =
    typeof value.nonAdvancingTurns === "number" ? value.nonAdvancingTurns : 0
  const history = Array.isArray(value.history) ? (value.history as PackProgress["history"]) : []
  return {
    version: 1,
    state: value.state as PackState,
    hintLevel: Math.max(0, Math.min(3, Math.round(hintLevel))),
    nonAdvancingTurns: Math.max(0, Math.round(nonAdvancingTurns)),
    history,
  }
}

export type PackStoreError = "SESSION_NOT_FOUND" | "UNAUTHORIZED" | "WRITE_FAILED"

interface OwnedSession {
  packProgress: PackProgress | null
}

async function readOwnedSession(
  sessionId: string,
  userId: string
): Promise<{ ok: true; session: OwnedSession } | { ok: false; error: PackStoreError }> {
  const snap = await getDoc(doc(db, "interview_sessions", sessionId))
  if (!snap.exists()) return { ok: false, error: "SESSION_NOT_FOUND" }
  const data = snap.data()
  if (data.user_id !== userId) return { ok: false, error: "UNAUTHORIZED" }
  return {
    ok: true,
    session: { packProgress: normalizePackProgress(data.session_state?.pack_progress) },
  }
}

/** Read the owner's pack progress, or null when absent. Ownership-scoped. */
export async function getPackProgress(
  sessionId: string,
  userId: string
): Promise<{ ok: true; progress: PackProgress | null } | { ok: false; error: PackStoreError }> {
  const owned = await readOwnedSession(sessionId, userId)
  if (!owned.ok) return owned
  return { ok: true, progress: owned.session.packProgress }
}

async function writePackProgress(sessionId: string, progress: PackProgress): Promise<boolean> {
  try {
    await setDoc(
      doc(db, "interview_sessions", sessionId),
      { session_state: { pack_progress: progress }, updated_at: new Date().toISOString() },
      { merge: true }
    )
    return true
  } catch {
    return false
  }
}

/**
 * The authoritative advance: load the owner's progress (or init), apply exactly one
 * machine step, persist, and return the transition. This is the ONLY writer of
 * pack_progress, so state can never be forged by the client.
 */
export async function advancePackProgress(
  sessionId: string,
  userId: string,
  input: PackInput
): Promise<{ ok: true; result: PackTransitionResult } | { ok: false; error: PackStoreError }> {
  const owned = await readOwnedSession(sessionId, userId)
  if (!owned.ok) return owned

  const current = owned.session.packProgress ?? initPackProgress()
  const result = advancePackState(current, input)

  const wrote = await writePackProgress(sessionId, result.progress)
  if (!wrote) return { ok: false, error: "WRITE_FAILED" }

  return { ok: true, result }
}
