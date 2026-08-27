/**
 * Server-side persistence for Sprint Lab runs (`sprintLabRuns` collection) and
 * their per-file workspace store (`sprintLabRuns/{runId}/files` subcollection).
 *
 * Follows `lib/labs/case-lab-runs.ts`'s conventions (Zod-validated trust
 * boundary, ownership always taken from the authenticated caller, malformed
 * docs parse to `null` rather than a raw cast) with one deliberate departure:
 * Case Lab's `milestoneStatus` is a client-owned whole-object overwrite on
 * every save, but a Sprint Lab run's `board` is NOT — PLAN.md Task 6 requires
 * server-validated transitions (legal moves only, one ticket "doing" at a
 * time), so there is no generic upsert here. Board and sprint state change
 * only through the narrow `moveSprintLabTicket` / `advanceSprintLabRun`
 * actions below; a client can never PUT an arbitrary board.
 *
 * Used by `app/api/sprint-labs/runs/route.ts` and
 * `app/api/sprint-labs/runs/files/route.ts`; keep those handlers thin and
 * call these. Types (`SprintLabRun`, `WorkspaceFileDoc`, ...) come from
 * `./types` (PLAN.md Task 1) and are imported, never redefined.
 */

import { z } from "zod"
import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"
import { isValidWorkspacePath } from "@/lib/workspace-execution/validators"
import { getSprint, getTicket, getWorkbookSummary } from "@/lib/sprint-labs/content/registry"
import {
  sprintLabRunSchema,
  ticketBoardStatusSchema,
  workspaceFileDocSchema,
  MAX_WORKSPACE_FILE_CONTENT_CHARS,
  type SprintLabRun,
  type TicketBoardStatus,
  type WorkspaceFileDoc,
} from "./types"
import {
  MAX_WORKSPACE_FILES_PER_SAVE,
  encodeWorkspaceFilePathId,
  decodeWorkspaceFilePathId,
} from "./workspace-files"

const COLLECTION = "sprintLabRuns"
const FILES_SUBCOLLECTION = "files"

/** Per-run cap on total saved files (fix round 2026-08-26, I5) — a runaway or malicious
 * client should not be able to grow one run's workspace store without bound. Meridian's
 * seed is ~60 files; 200 leaves ample headroom for learner-created files. */
const MAX_WORKSPACE_FILES_PER_RUN = 200

/** Firestore document ids may not be exactly `__.*__` (reserved) and are capped at 1,500
 * bytes; bounded here to 1,400 to leave margin, and checked before ever reaching Firestore
 * so a bad path fails as a clean 400 instead of an opaque write-time error (fix round
 * 2026-08-26, M10). */
const RESERVED_FIRESTORE_DOC_ID_PATTERN = /^__.*__$/
const MAX_FIRESTORE_DOC_ID_BYTES = 1400

function isValidFirestoreDocId(docId: string): boolean {
  if (RESERVED_FIRESTORE_DOC_ID_PATTERN.test(docId)) return false
  return new TextEncoder().encode(docId).length <= MAX_FIRESTORE_DOC_ID_BYTES
}

/**
 * Error codes thrown by the mutating functions below, as plain `Error`
 * messages (the `upsertCaseLabRun` convention: `throw new Error("UNAUTHORIZED")`,
 * caught by message in the route). Exported as constants — not just inline
 * strings — so a route's catch block and this module's throw sites can never
 * drift out of sync with each other.
 */
export const SPRINT_LAB_RUN_ERRORS = {
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNKNOWN_TICKET: "UNKNOWN_TICKET",
  INVALID_TRANSITION: "INVALID_TRANSITION",
  TICKET_ALREADY_DOING: "TICKET_ALREADY_DOING",
  INVALID_SPRINT_ADVANCE: "INVALID_SPRINT_ADVANCE",
  /** The run is completed/abandoned; board, sprint, and file mutations are closed (fix round 2026-08-26, M8). */
  RUN_NOT_ACTIVE: "RUN_NOT_ACTIVE",
} as const

type SprintLabRunErrorCode = (typeof SPRINT_LAB_RUN_ERRORS)[keyof typeof SPRINT_LAB_RUN_ERRORS]

/** Map a thrown service error to the HTTP status a route should respond with, or `null` for a 500. */
export function sprintLabRunErrorStatus(error: unknown): number | null {
  if (!(error instanceof Error)) return null
  switch (error.message as SprintLabRunErrorCode) {
    case SPRINT_LAB_RUN_ERRORS.NOT_FOUND:
      return 404
    case SPRINT_LAB_RUN_ERRORS.UNAUTHORIZED:
      return 403
    case SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED:
      return 400
    case SPRINT_LAB_RUN_ERRORS.UNKNOWN_TICKET:
    case SPRINT_LAB_RUN_ERRORS.INVALID_TRANSITION:
    case SPRINT_LAB_RUN_ERRORS.TICKET_ALREADY_DOING:
    case SPRINT_LAB_RUN_ERRORS.INVALID_SPRINT_ADVANCE:
    case SPRINT_LAB_RUN_ERRORS.RUN_NOT_ACTIVE:
      return 409
    default:
      return null
  }
}

/**
 * `SprintLabRun` (Task 1) deliberately omits the Firestore doc id — see its
 * doc comment in `./types`, which names this module as the place that attaches
 * it. Every function below that returns a run returns this shape.
 */
export type StoredSprintLabRun = SprintLabRun & { id: string }

// ============================================================
// Board transition matrix
// ============================================================

/**
 * Legal board moves, per PLAN.md Task 6: "todo→doing→review→done,
 * review→doing. Reject others." `done` is terminal — nothing transitions out
 * of it here (reopening a done ticket is not a Task 6 requirement; if a later
 * task needs it, it is a deliberate new rule, not an oversight of this one).
 */
export const LEGAL_BOARD_TRANSITIONS: Record<TicketBoardStatus, readonly TicketBoardStatus[]> = {
  todo: ["doing"],
  doing: ["review"],
  review: ["done", "doing"],
  done: [],
}

export function isLegalBoardTransition(from: TicketBoardStatus, to: TicketBoardStatus): boolean {
  return LEGAL_BOARD_TRANSITIONS[from].includes(to)
}

// ============================================================
// Input schemas (trust boundary)
// ============================================================

export const createSprintLabRunInputSchema = z.object({
  workbookId: z.string().min(1),
  contentVersion: z.string().min(1),
  /** The current sprint's ticket keys, seeded onto the board as "todo". */
  ticketKeys: z.array(z.string().min(1)).min(1),
})
export type CreateSprintLabRunInput = z.infer<typeof createSprintLabRunInputSchema>

export const advanceSprintLabRunInputSchema = z.object({
  runId: z.string().min(1),
  toSprint: z.number().int().positive(),
  /** The new sprint's ticket keys, merged in as "todo". Keys already on the board are left untouched. */
  ticketKeys: z.array(z.string().min(1)).default([]),
})
export type AdvanceSprintLabRunInput = z.infer<typeof advanceSprintLabRunInputSchema>

export const moveSprintLabTicketInputSchema = z.object({
  runId: z.string().min(1),
  ticketKey: z.string().min(1),
  to: ticketBoardStatusSchema,
})
export type MoveSprintLabTicketInput = z.infer<typeof moveSprintLabTicketInputSchema>

const workspaceFileSaveInputSchema = z.object({
  path: z.string().min(1),
  content: z.string().max(MAX_WORKSPACE_FILE_CONTENT_CHARS),
})

export const saveWorkspaceFilesInputSchema = z.object({
  runId: z.string().min(1),
  files: z.array(workspaceFileSaveInputSchema).min(1).max(MAX_WORKSPACE_FILES_PER_SAVE),
})
export type SaveWorkspaceFilesInput = z.infer<typeof saveWorkspaceFilesInputSchema>

// ============================================================
// Parsing (malformed docs read as absent, never as a raw cast)
// ============================================================

function parseStoredRun(raw: unknown, id: string): StoredSprintLabRun | null {
  const parsed = sprintLabRunSchema.safeParse(raw)
  if (!parsed.success) {
    logger.warn("Discarding malformed sprintLabRuns doc", {
      id,
      issues: parsed.error.errors.map((e) => e.message),
    })
    return null
  }
  return { id, ...parsed.data }
}

function parseStoredWorkspaceFile(raw: unknown, docId: string): WorkspaceFileDoc | null {
  const parsed = workspaceFileDocSchema.safeParse(raw)
  if (!parsed.success) {
    logger.warn("Discarding malformed sprintLabRuns files doc", {
      docId,
      issues: parsed.error.errors.map((e) => e.message),
    })
    return null
  }
  // Defense-in-depth: the doc id and the stored `path` field must agree. A
  // mismatch (corruption, or a doc written outside this module) is exactly
  // the kind of thing that should read as "not there" rather than surface a
  // file under the wrong path.
  if (decodeWorkspaceFilePathId(docId) !== parsed.data.path) {
    logger.warn("Discarding sprintLabRuns files doc whose id disagrees with its path field", {
      docId,
      path: parsed.data.path,
    })
    return null
  }
  return parsed.data
}

// ============================================================
// Ownership
// ============================================================

/** Fetch a run and verify the caller owns it, throwing NOT_FOUND / UNAUTHORIZED otherwise. */
async function requireOwnedRun(userId: string, runId: string): Promise<StoredSprintLabRun> {
  const snap = await adminDb.collection(COLLECTION).doc(runId).get()
  if (!snap.exists) throw new Error(SPRINT_LAB_RUN_ERRORS.NOT_FOUND)
  const run = parseStoredRun(snap.data(), snap.id)
  if (!run) throw new Error(SPRINT_LAB_RUN_ERRORS.NOT_FOUND)
  if (run.userId !== userId) throw new Error(SPRINT_LAB_RUN_ERRORS.UNAUTHORIZED)
  return run
}

/**
 * Same as {@link requireOwnedRun}, plus: the run must still be `in_progress`.
 * Used by every MUTATING entry point (board moves, sprint advance, file
 * saves) so a completed/abandoned run is closed to further writes (fix round
 * 2026-08-26, M8) — reads (`listWorkspaceFiles`, `getSprintLabRun`) stay on
 * the plain `requireOwnedRun`/no-check path, since viewing a finished run's
 * final state (retro/summary) must keep working.
 *
 * Exported (fix round 2, OPEN 2): the route needs to run this SAME check
 * ahead of spending quota on a sprint advance, so an invalid/inactive-run
 * request never burns a session before being rejected. See
 * `app/api/sprint-labs/runs/route.ts`'s PATCH advance-sprint handler.
 */
export async function requireOwnedActiveRun(
  userId: string,
  runId: string
): Promise<StoredSprintLabRun> {
  const run = await requireOwnedRun(userId, runId)
  if (run.status !== "in_progress") throw new Error(SPRINT_LAB_RUN_ERRORS.RUN_NOT_ACTIVE)
  return run
}

/**
 * Validate that `workbookId` is a compiled workbook, `sprintNumber` is one of
 * its compiled sprints, and every key in `ticketKeys` resolves to a real
 * ticket somewhere in that workbook (fix round 2026-08-26, I4) — closes the
 * gap where a client could forge an arbitrary board with made-up ticket keys
 * or advance into a workbook/sprint that was never authored.
 *
 * `lib/sprint-labs/content/registry.ts`'s `getSprint`/`getTicket` are async
 * (they lazy-load a workbook's compiled content behind a dynamic import;
 * `getWorkbookSummary` is not, today, but is awaited here too so this
 * function does not silently break if that changes). Fix round 2, OPEN 1:
 * an earlier version of this function called them synchronously — `!aPromise`
 * is always `false`, so the "unknown workbook/sprint/ticket" branches never
 * fired in production even though the unit tests (which stubbed the registry
 * as plain synchronous functions) passed. Every call is now properly
 * `await`ed, and the test mocks were fixed to return Promises so a
 * regression here would fail the tests again.
 *
 * Known limitation: the registry indexes tickets by key across the whole
 * workbook (`ticketsByKey`), not per sprint — there is no exposed "ticket
 * keys for sprint N" lookup. `getTicket` here therefore confirms a ticket
 * exists SOMEWHERE in the compiled workbook, not that it belongs to exactly
 * `sprintNumber`. Tightening this to an exact per-sprint set needs a
 * Task-2-owned registry addition; noted in the fix report rather than forked
 * around here.
 *
 * Exported (fix round 2, OPEN 2): needed at the route layer for the same
 * pre-quota validation reason as `requireOwnedActiveRun` above.
 */
export async function requireKnownWorkbookAndTickets(
  workbookId: string,
  sprintNumber: number,
  ticketKeys: string[]
): Promise<void> {
  const [summary, sprint] = await Promise.all([
    getWorkbookSummary(workbookId),
    getSprint(workbookId, sprintNumber),
  ])
  if (!summary) throw new Error(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
  if (!sprint) throw new Error(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)

  const tickets = await Promise.all(ticketKeys.map((key) => getTicket(workbookId, key)))
  if (tickets.some((ticket) => !ticket)) throw new Error(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
}

// ============================================================
// Run reads
// ============================================================

/** Fetch a run by id, scoped to its owner (returns null if not owned/missing/malformed). */
export async function getSprintLabRun(
  userId: string,
  runId: string
): Promise<StoredSprintLabRun | null> {
  const snap = await adminDb.collection(COLLECTION).doc(runId).get()
  if (!snap.exists) return null
  const run = parseStoredRun(snap.data(), snap.id)
  if (!run || run.userId !== userId) return null
  return run
}

/**
 * The user's active run for a workbook — an in-progress one to resume, or
 * failing that the most recent completed one (abandoned runs are ignored).
 * Mirrors `getActiveCaseLabRun`: queries by `userId` only (an auto single-field
 * index) and filters/sorts in memory so no composite index is required.
 */
export async function getActiveSprintLabRun(
  userId: string,
  workbookId: string
): Promise<StoredSprintLabRun | null> {
  const query = await adminDb.collection(COLLECTION).where("userId", "==", userId).get()
  const runs = query.docs
    .map((doc) => parseStoredRun(doc.data(), doc.id))
    .filter((run): run is StoredSprintLabRun => run !== null)
    .filter(
      (run) =>
        run.workbookId === workbookId &&
        (run.status === "in_progress" || run.status === "completed")
    )
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "in_progress" ? -1 : 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  return runs[0] ?? null
}

// ============================================================
// Run lifecycle: create/resume, advance sprint, move ticket
// ============================================================

/**
 * Create-or-resume a run for (userId, workbookId): returns the existing
 * in_progress run untouched if one exists (this is the "resume" half — a
 * second call with a different `contentVersion`/`ticketKeys` does NOT mutate
 * the run already in flight), otherwise creates a fresh run at sprint 1 with
 * every given ticket key seeded onto the board as "todo". A workbook the user
 * has only ever COMPLETED starts a brand new run (a fresh attempt), matching
 * `getActiveSprintLabRun`'s status-based read semantics.
 */
export async function createSprintLabRun(
  userId: string,
  input: CreateSprintLabRunInput
): Promise<StoredSprintLabRun> {
  const parsed = createSprintLabRunInputSchema.safeParse(input)
  if (!parsed.success) throw new Error(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
  const { workbookId, contentVersion, ticketKeys } = parsed.data

  const active = await getActiveSprintLabRun(userId, workbookId)
  if (active && active.status === "in_progress") return active

  // Validated here (not at the top of the function): a resume above returns
  // before this ever runs, so a stale/irrelevant ticketKeys array on a resume
  // call is never rejected for content it will never touch. A genuine create
  // always validates before anything is written.
  await requireKnownWorkbookAndTickets(workbookId, 1, ticketKeys)

  const now = new Date().toISOString()
  const board = Object.fromEntries(ticketKeys.map((key) => [key, "todo" as const])) as Record<
    string,
    TicketBoardStatus
  >
  const run: SprintLabRun = {
    userId,
    workbookId,
    contentVersion,
    currentSprint: 1,
    board,
    status: "in_progress",
    startedAt: now,
    updatedAt: now,
  }
  const ref = adminDb.collection(COLLECTION).doc()
  await ref.set(run)
  return { id: ref.id, ...run }
}

/**
 * Advance to the next sprint (sequential only — `toSprint` must be exactly
 * `currentSprint + 1`; skipping ahead is rejected). Merges `ticketKeys` onto
 * the board as "todo", additively: a key already present (any status) is left
 * untouched, so tickets from earlier sprints keep their real progress.
 *
 * Tier gating (`requireTierForUser` for sprint >= 2) and session-start
 * accounting (`recordSessionStartAdmin`) are the ROUTE's job, not this
 * function's — same reasoning as `verifyAuth` never appearing in a service
 * module. This function only enforces the sequencing rule itself.
 */
export async function advanceSprintLabRun(
  userId: string,
  input: AdvanceSprintLabRunInput
): Promise<StoredSprintLabRun> {
  const parsed = advanceSprintLabRunInputSchema.safeParse(input)
  if (!parsed.success) throw new Error(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
  const { runId, toSprint, ticketKeys } = parsed.data

  const run = await requireOwnedActiveRun(userId, runId)
  if (toSprint !== run.currentSprint + 1) {
    throw new Error(SPRINT_LAB_RUN_ERRORS.INVALID_SPRINT_ADVANCE)
  }
  await requireKnownWorkbookAndTickets(run.workbookId, toSprint, ticketKeys)

  const now = new Date().toISOString()
  const board = { ...run.board }
  for (const key of ticketKeys) {
    if (!(key in board)) board[key] = "todo"
  }

  await adminDb.collection(COLLECTION).doc(runId).update({
    currentSprint: toSprint,
    board,
    updatedAt: now,
  })

  return { ...run, currentSprint: toSprint, board, updatedAt: now }
}

/**
 * Move one ticket on the board. Server-validated: only a transition present
 * in {@link LEGAL_BOARD_TRANSITIONS} is accepted, and at most one ticket may
 * be "doing" at a time (entering "doing" while another ticket already holds
 * it is rejected). Entering "doing" also sets `currentTicketKey` — the
 * workspace's "which ticket is open" pointer.
 */
export async function moveSprintLabTicket(
  userId: string,
  input: MoveSprintLabTicketInput
): Promise<StoredSprintLabRun> {
  const parsed = moveSprintLabTicketInputSchema.safeParse(input)
  if (!parsed.success) throw new Error(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
  const { runId, ticketKey, to } = parsed.data

  const run = await requireOwnedActiveRun(userId, runId)
  const from = run.board[ticketKey]
  if (from === undefined) throw new Error(SPRINT_LAB_RUN_ERRORS.UNKNOWN_TICKET)
  if (!isLegalBoardTransition(from, to)) throw new Error(SPRINT_LAB_RUN_ERRORS.INVALID_TRANSITION)

  if (to === "doing") {
    const anotherTicketIsDoing = Object.entries(run.board).some(
      ([key, status]) => key !== ticketKey && status === "doing"
    )
    if (anotherTicketIsDoing) throw new Error(SPRINT_LAB_RUN_ERRORS.TICKET_ALREADY_DOING)
  }

  const now = new Date().toISOString()
  const board = { ...run.board, [ticketKey]: to }
  const update: Record<string, unknown> = { board, updatedAt: now }
  if (to === "doing") update.currentTicketKey = ticketKey

  await adminDb.collection(COLLECTION).doc(runId).update(update)

  return {
    ...run,
    board,
    updatedAt: now,
    ...(to === "doing" ? { currentTicketKey: ticketKey } : {}),
  }
}

// ============================================================
// Workspace file store (subcollection `files`)
// ============================================================

/** List every saved workspace file for a run, ownership-checked, sorted by path. */
export async function listWorkspaceFiles(
  userId: string,
  runId: string
): Promise<WorkspaceFileDoc[]> {
  await requireOwnedRun(userId, runId)
  const snap = await adminDb.collection(COLLECTION).doc(runId).collection(FILES_SUBCOLLECTION).get()
  return snap.docs
    .map((doc) => parseStoredWorkspaceFile(doc.data(), doc.id))
    .filter((file): file is WorkspaceFileDoc => file !== null)
    .sort((a, b) => a.path.localeCompare(b.path))
}

/**
 * Batched save of changed workspace files (up to {@link MAX_WORKSPACE_FILES_PER_SAVE}
 * per call, and never past {@link MAX_WORKSPACE_FILES_PER_RUN} total for the
 * run). Validation is all-or-nothing over the WHOLE batch before any write
 * happens: an invalid path (fails `isValidWorkspacePath`, reusing the repo's
 * existing validator rather than forking it), a duplicate path within the
 * same call (M6 — two entries for one path would race each other's revision
 * and silently pick a batch-order-dependent winner), a reserved/oversize
 * Firestore doc id (M10), or oversize content (`>MAX_WORKSPACE_FILE_CONTENT_CHARS`,
 * enforced by the Zod schema) rejects every file in the call, not just the
 * bad one — a partial save would leave the client's dirty-tracking out of
 * sync with what actually landed.
 *
 * One bulk read of the run's existing files backs both the per-run file-count
 * ceiling and each file's current revision (replacing the previous per-file
 * `.get()` calls). Revision is computed from that read (existing + 1, or 1
 * for a brand-new path) rather than `FieldValue.increment`, so the returned
 * values are exact, deterministic numbers the caller can use immediately.
 * This is safe under this feature's actual write pattern (the client hook
 * debounces and flushes single-flight, so two concurrent saves of the same
 * run's same path are not a realistic race); a true concurrent-writer
 * scenario would need `FieldValue.increment` instead.
 *
 * Also bumps the run doc's own `updatedAt` (M7) in the same batch, so
 * file-only activity still moves the run's last-touched timestamp.
 */
export async function saveWorkspaceFiles(
  userId: string,
  input: SaveWorkspaceFilesInput
): Promise<WorkspaceFileDoc[]> {
  const parsed = saveWorkspaceFilesInputSchema.safeParse(input)
  if (!parsed.success) throw new Error(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
  const { runId, files } = parsed.data

  const paths = files.map((file) => file.path)
  if (new Set(paths).size !== paths.length) throw new Error(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)

  for (const file of files) {
    if (!isValidWorkspacePath(file.path)) throw new Error(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
    if (!isValidFirestoreDocId(encodeWorkspaceFilePathId(file.path))) {
      throw new Error(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
    }
  }

  await requireOwnedActiveRun(userId, runId)

  const filesCollection = adminDb.collection(COLLECTION).doc(runId).collection(FILES_SUBCOLLECTION)
  const now = new Date().toISOString()

  // One read for the whole existing file set backs the per-run ceiling AND
  // every file's current revision, replacing what used to be N individual
  // per-file reads.
  const existingSnap = await filesCollection.get()
  const existingRevisionById = new Map<string, number>()
  for (const doc of existingSnap.docs) {
    const existing = parseStoredWorkspaceFile(doc.data(), doc.id)
    existingRevisionById.set(doc.id, existing?.revision ?? 0)
  }

  const refs = files.map((file) => {
    const docId = encodeWorkspaceFilePathId(file.path)
    return { file, docId, ref: filesCollection.doc(docId) }
  })

  const newFileCount = refs.filter(({ docId }) => !existingRevisionById.has(docId)).length
  if (existingRevisionById.size + newFileCount > MAX_WORKSPACE_FILES_PER_RUN) {
    throw new Error(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
  }

  const toWrite: WorkspaceFileDoc[] = refs.map(({ file, docId }) => {
    const revision = (existingRevisionById.get(docId) ?? 0) + 1
    return { path: file.path, content: file.content, updatedAt: now, revision }
  })

  const batch = adminDb.batch()
  toWrite.forEach((doc, index) => {
    // workspaceFileDocSchema re-validated here (not just at the input-schema
    // layer above): this is the exact shape being persisted, server-stamped
    // fields included, so a future change to either schema is caught here too.
    const validated = workspaceFileDocSchema.parse(doc)
    batch.set(refs[index].ref, validated)
  })
  batch.update(adminDb.collection(COLLECTION).doc(runId), { updatedAt: now })
  await batch.commit()

  return toWrite
}
