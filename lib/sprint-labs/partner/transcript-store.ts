/**
 * Sable partner transcript persistence (PLAN.md Task 14). Extends
 * lib/feedback/transcript-storage.ts's bounded, server-owned shape onto the
 * `sprintLabRuns/{runId}/transcripts/{ticketKey}` doc -- the exact
 * subcollection firestore.rules already reserves for it ("Sable partner
 * transcripts (Task 14). Server-owned, same posture as
 * lib/feedback/transcript-storage.ts's existing bounded subcollection;
 * never client-written."). One doc per (run, ticket): a learner's chat about
 * one ticket is one bounded conversation, addressed by `ticketKey` as the
 * Firestore document id.
 *
 * `mutedDirectiveIds` rides on this SAME doc rather than a new collection or
 * a field on the run/files docs (both owned by other Task 14 siblings):
 * "a `mutedDirectiveIds` field on your own chat GET/POST payloads persisted
 * in the transcripts subcollection ... doc you already own" (task brief).
 * Muting is exclusion only -- never recorded to the agent, never penalized,
 * never shown to it (AGENT-CONTEXT.md §7) -- so it is deliberately NOT one
 * of the frozen `SprintLabTranscriptMessage` fields (which the transcript's
 * literal injected text lives in); it is bookkeeping the panel reads back,
 * kept in its own top-level field on the same document.
 */

import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"
import { z } from "zod"
import { getSprintLabRun, requireOwnedActiveRun } from "@/lib/sprint-labs/runs"
import {
  sprintLabTranscriptMessageSchema,
  type SprintLabTranscript,
  type SprintLabTranscriptMessage,
} from "@/lib/sprint-labs/types"
import {
  TRANSCRIPT_MAX_CONTENT_CHARS,
  TRANSCRIPT_MAX_MESSAGES,
  TRANSCRIPT_MAX_TOTAL_BYTES,
} from "@/lib/feedback/transcript-storage"

const RUNS_COLLECTION = "sprintLabRuns"
const TRANSCRIPTS_SUBCOLLECTION = "transcripts"

/**
 * A ticketKey is authored content (a small, stable vocabulary from
 * workbook.yaml/ticket.md) but becomes a raw Firestore document id here --
 * validated the same defensive way runs.ts validates a workspace file path
 * id (its M10 fix): safe characters, bounded length, never a path segment.
 */
const SAFE_TICKET_KEY = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

export function isValidTicketKeyForDocId(ticketKey: string): boolean {
  return SAFE_TICKET_KEY.test(ticketKey)
}

const storedTranscriptDocSchema = z.object({
  messages: z.array(sprintLabTranscriptMessageSchema),
  truncated: z.boolean(),
  originalCount: z.number().int().nonnegative(),
  mutedDirectiveIds: z.array(z.string()).default([]),
})
type StoredPartnerTranscriptDoc = z.infer<typeof storedTranscriptDocSchema>

function transcriptRef(runId: string, ticketKey: string) {
  return adminDb
    .collection(RUNS_COLLECTION)
    .doc(runId)
    .collection(TRANSCRIPTS_SUBCOLLECTION)
    .doc(ticketKey)
}

function emptyDoc(): StoredPartnerTranscriptDoc {
  return { messages: [], truncated: false, originalCount: 0, mutedDirectiveIds: [] }
}

function parseStoredDoc(
  raw: unknown,
  runId: string,
  ticketKey: string
): StoredPartnerTranscriptDoc {
  const parsed = storedTranscriptDocSchema.safeParse(raw)
  if (!parsed.success) {
    logger.warn("Discarding malformed sprint lab partner transcript doc", {
      runId,
      ticketKey,
      issues: parsed.error.errors.map((e) => e.message),
    })
    return emptyDoc()
  }
  return parsed.data
}

/** Bounds a message list exactly like lib/feedback/transcript-storage.ts's `prepareTranscriptForStorage`: recency wins. */
function bound(messages: SprintLabTranscriptMessage[]): SprintLabTranscript {
  const originalCount = messages.length
  let truncated = false
  let bounded = messages

  if (bounded.length > TRANSCRIPT_MAX_MESSAGES) {
    bounded = bounded.slice(-TRANSCRIPT_MAX_MESSAGES)
    truncated = true
  }
  bounded = bounded.map((message) => {
    if (message.content.length <= TRANSCRIPT_MAX_CONTENT_CHARS) return message
    truncated = true
    return { ...message, content: message.content.slice(0, TRANSCRIPT_MAX_CONTENT_CHARS) }
  })
  while (bounded.length > 1 && JSON.stringify(bounded).length > TRANSCRIPT_MAX_TOTAL_BYTES) {
    bounded = bounded.slice(Math.ceil(bounded.length / 4))
    truncated = true
  }
  return { messages: bounded, truncated, originalCount }
}

/**
 * Fetch the learner's transcript + directive mutes for (runId, ticketKey).
 * Read-only, so it uses `getSprintLabRun` (ownership only, not
 * active-required) rather than `requireOwnedActiveRun` -- viewing chat
 * history on a completed/abandoned run must keep working, matching
 * `listWorkspaceFiles`'s same read/write asymmetry in runs.ts. Returns null
 * only when the caller does not own (or the run does not exist for) `runId`.
 */
export async function getPartnerTranscript(
  userId: string,
  runId: string,
  ticketKey: string
): Promise<{ transcript: SprintLabTranscript; mutedDirectiveIds: string[] } | null> {
  const run = await getSprintLabRun(userId, runId)
  if (!run) return null

  const snap = await transcriptRef(runId, ticketKey).get()
  if (!snap.exists) {
    return {
      transcript: { messages: [], truncated: false, originalCount: 0 },
      mutedDirectiveIds: [],
    }
  }

  const doc = parseStoredDoc(snap.data(), runId, ticketKey)
  return {
    transcript: {
      messages: doc.messages,
      truncated: doc.truncated,
      originalCount: doc.originalCount,
    },
    mutedDirectiveIds: doc.mutedDirectiveIds,
  }
}

/**
 * Append one exchange's turns (learner + Sable) and persist, bounded.
 * Ownership + active-run enforced via `requireOwnedActiveRun` -- the same
 * posture as every other Sprint Labs mutation (runs.ts, attempts-service.ts):
 * a completed/abandoned run is closed to new chat activity.
 */
export async function appendPartnerTurns(
  userId: string,
  runId: string,
  ticketKey: string,
  newMessages: SprintLabTranscriptMessage[]
): Promise<SprintLabTranscript> {
  await requireOwnedActiveRun(userId, runId)

  const ref = transcriptRef(runId, ticketKey)
  const snap = await ref.get()
  const existing = snap.exists ? parseStoredDoc(snap.data(), runId, ticketKey) : emptyDoc()

  const combined = bound([...existing.messages, ...newMessages])
  const toStore: StoredPartnerTranscriptDoc = {
    ...combined,
    mutedDirectiveIds: existing.mutedDirectiveIds,
  }
  await ref.set(storedTranscriptDocSchema.parse(toStore))
  return combined
}

/**
 * Toggle one directive's mute state for (runId, ticketKey). Muting is
 * exclusion only: it is never recorded to the agent, never penalized, and
 * never shown to it (AGENT-CONTEXT.md §7) -- callers exclude a muted
 * directive's id from what they pass into `layerC`'s `directives` input;
 * this function only ever tracks WHICH ids are currently muted.
 */
export async function setPartnerDirectiveMuted(
  userId: string,
  runId: string,
  ticketKey: string,
  directiveId: string,
  muted: boolean
): Promise<string[]> {
  await requireOwnedActiveRun(userId, runId)

  const ref = transcriptRef(runId, ticketKey)
  const snap = await ref.get()
  const existing = snap.exists ? parseStoredDoc(snap.data(), runId, ticketKey) : emptyDoc()

  const withoutId = existing.mutedDirectiveIds.filter((id) => id !== directiveId)
  const mutedDirectiveIds = muted ? [...withoutId, directiveId] : withoutId

  const toStore: StoredPartnerTranscriptDoc = { ...existing, mutedDirectiveIds }
  await ref.set(storedTranscriptDocSchema.parse(toStore))
  return mutedDirectiveIds
}
