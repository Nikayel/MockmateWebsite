/**
 * Lifecycle record for the SM-2 vs FSRS experiment.
 *
 * Two gaps this closes.
 *
 * 1. THE SWEEP HAD NO MEMORY. Ending the A/B walks every user in pages and
 *    returns a cursor to the browser, which drives the next page. If that
 *    browser tab was closed, lost its network or hit an error mid-sweep, the
 *    cursor died with it: `ab_ended` stayed false, some users were already
 *    converted, and the only way forward was to restart the whole scan with no
 *    record of how far the previous attempt got. The cursor is now persisted
 *    server side after every page, so a sweep can be resumed rather than
 *    restarted, and an interrupted sweep is visible instead of silent.
 *
 * 2. `ab_ended` WAS ONE WAY. There was no start date, no status, no record of
 *    who ended it, and no way back if it was ended by mistake. The registry
 *    carries the lifecycle (running, sweeping, ended, rolled back) with the
 *    declared design beside it, and `reopenAbTest()` is the documented undo.
 *
 * The A/B's runtime switch still lives in `research_config/algorithm`, read by
 * `getAlgorithmConfig()` on the hot path. This registry is the lifecycle
 * record that sits beside it, kept as a separate document so a lifecycle write
 * can never disturb the field every review reads.
 */

import { adminDb } from "../firebase-admin"
import { clearAlgorithmConfigCache } from "../spaced-repetition/algorithm-config"
import { EXPERIMENT_DESIGN } from "./experiment-readout"

const REGISTRY_COLLECTION = "research_config"
const REGISTRY_DOC = "experiment_registry"

/** The runtime switch the algorithm router reads. Written only by the undo. */
const ALGORITHM_CONFIG_DOC = "algorithm"

export type ExperimentStatus = "running" | "sweeping" | "ended" | "rolled_back"

export interface ExperimentSweepState {
  /** True between the first page of a live sweep and its last. */
  inProgress: boolean
  /** Where to resume. null means "start from the beginning" or "finished". */
  cursor: string | null
  pagesCompleted: number
  usersFlipped: number
  cardsConverted: number
  startedAt: string | null
  updatedAt: string | null
  lastError: string | null
}

export interface ExperimentRegistryEntry {
  experimentId: string
  status: ExperimentStatus
  startedAt: string | null
  endedAt: string | null
  endedBy: string | null
  rolledBackAt: string | null
  rolledBackBy: string | null
  rollbackReason: string | null
  /** The declared design, copied in so a stored result carries its own plan. */
  design: {
    primaryMetric: string
    alpha: number
    targetEffectSize: number
    minUsersPerArm: number
    stoppingRule: string
  }
  sweep: ExperimentSweepState
  updatedAt: string | null
}

const EMPTY_SWEEP: ExperimentSweepState = {
  inProgress: false,
  cursor: null,
  pagesCompleted: 0,
  usersFlipped: 0,
  cardsConverted: 0,
  startedAt: null,
  updatedAt: null,
  lastError: null,
}

/**
 * Fill a stored registry document out to the full shape.
 *
 * Exported and pure so the defaults can be tested without Firestore. A missing
 * document is a legitimate state (the experiment predates this registry), and
 * it resolves to "running with an unknown start date" rather than to an
 * invented start.
 */
export function normalizeRegistry(
  stored: Record<string, unknown> | null | undefined
): ExperimentRegistryEntry {
  const data = stored ?? {}
  const sweep = (data.sweep as Partial<ExperimentSweepState> | undefined) ?? {}

  const status = ((): ExperimentStatus => {
    const raw = data.status
    return raw === "running" || raw === "sweeping" || raw === "ended" || raw === "rolled_back"
      ? raw
      : "running"
  })()

  return {
    experimentId: (data.experimentId as string) ?? EXPERIMENT_DESIGN.experimentId,
    status,
    startedAt: (data.startedAt as string) ?? null,
    endedAt: (data.endedAt as string) ?? null,
    endedBy: (data.endedBy as string) ?? null,
    rolledBackAt: (data.rolledBackAt as string) ?? null,
    rolledBackBy: (data.rolledBackBy as string) ?? null,
    rollbackReason: (data.rollbackReason as string) ?? null,
    design: {
      primaryMetric: EXPERIMENT_DESIGN.primaryMetric,
      alpha: EXPERIMENT_DESIGN.alpha,
      targetEffectSize: EXPERIMENT_DESIGN.targetEffectSize,
      minUsersPerArm: EXPERIMENT_DESIGN.minUsersPerArm,
      stoppingRule: EXPERIMENT_DESIGN.stoppingRule,
    },
    sweep: {
      inProgress: sweep.inProgress === true,
      cursor: sweep.cursor ?? null,
      pagesCompleted: sweep.pagesCompleted ?? 0,
      usersFlipped: sweep.usersFlipped ?? 0,
      cardsConverted: sweep.cardsConverted ?? 0,
      startedAt: sweep.startedAt ?? null,
      updatedAt: sweep.updatedAt ?? null,
      lastError: sweep.lastError ?? null,
    },
    updatedAt: (data.updatedAt as string) ?? null,
  }
}

/** Read the lifecycle record. Never writes, so a GET stays a GET. */
export async function getExperimentRegistry(): Promise<ExperimentRegistryEntry> {
  if (!adminDb) return normalizeRegistry(null)
  try {
    const doc = await adminDb.collection(REGISTRY_COLLECTION).doc(REGISTRY_DOC).get()
    return normalizeRegistry(doc.exists ? (doc.data() as Record<string, unknown>) : null)
  } catch (error) {
    console.error("[ExperimentRegistry] Failed to read registry:", error)
    return normalizeRegistry(null)
  }
}

/**
 * Compute the next sweep state from the current one and the page just applied.
 * Pure, so the resume semantics are testable.
 */
export function nextSweepState(
  current: ExperimentSweepState,
  page: {
    dryRun: boolean
    nextCursor: string | null
    usersFlipped: number
    cardsConverted: number
    errorCount: number
  },
  now: string
): ExperimentSweepState {
  // A dry run must leave no trace on the resume state: it converts nothing, so
  // resuming from its cursor would skip users a live sweep still has to visit.
  if (page.dryRun) return current

  const finished = page.nextCursor === null
  return {
    inProgress: !finished,
    cursor: page.nextCursor,
    pagesCompleted: current.pagesCompleted + 1,
    usersFlipped: current.usersFlipped + page.usersFlipped,
    cardsConverted: current.cardsConverted + page.cardsConverted,
    startedAt: current.startedAt ?? now,
    updatedAt: now,
    lastError: page.errorCount > 0 ? `${page.errorCount} users errored on the last page` : null,
  }
}

/**
 * Persist the outcome of one sweep page so an interrupted sweep can resume.
 * Never throws: losing the bookkeeping must not fail the migration that
 * already succeeded, and the loss is loud in the logs.
 */
export async function recordSweepPage(
  adminId: string,
  page: {
    dryRun: boolean
    nextCursor: string | null
    usersFlipped: number
    cardsConverted: number
    errorCount: number
  }
): Promise<ExperimentSweepState | null> {
  if (!adminDb) return null

  try {
    const registry = await getExperimentRegistry()
    const now = new Date().toISOString()
    const sweep = nextSweepState(registry.sweep, page, now)
    if (page.dryRun) return sweep

    const finished = page.nextCursor === null
    await adminDb
      .collection(REGISTRY_COLLECTION)
      .doc(REGISTRY_DOC)
      .set(
        {
          experimentId: registry.experimentId,
          status: finished ? "ended" : "sweeping",
          startedAt: registry.startedAt,
          ...(finished ? { endedAt: now, endedBy: adminId } : {}),
          sweep,
          updatedAt: now,
        },
        { merge: true }
      )

    return sweep
  } catch (error) {
    console.error("[ExperimentRegistry] Failed to record sweep page:", error)
    return null
  }
}

/** Record that a sweep failed part way, keeping the cursor for the retry. */
export async function recordSweepFailure(message: string): Promise<void> {
  if (!adminDb) return
  try {
    await adminDb
      .collection(REGISTRY_COLLECTION)
      .doc(REGISTRY_DOC)
      .set(
        {
          status: "sweeping",
          sweep: { inProgress: true, lastError: message, updatedAt: new Date().toISOString() },
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
  } catch (error) {
    console.error("[ExperimentRegistry] Failed to record sweep failure:", error)
  }
}

export interface ReopenResult {
  reopenedAt: string
  previousStatus: ExperimentStatus
}

/**
 * Undo `markAbTestEnded`: new users are randomized again.
 *
 * This writes `research_config/algorithm` directly because the spaced
 * repetition module only exposes the one-way `markAbTestEnded()`. The cache in
 * that module is cleared straight after, otherwise the router would keep
 * serving the ended config for up to its TTL.
 *
 * What this does NOT do is move anybody back to SM-2. Cards converted by the
 * sweep stay converted, because converting them back would be a second
 * unrequested rewrite of real user schedules. Reopening restores random
 * assignment for users who have not been assigned yet, and the caller is
 * expected to say so in the UI.
 */
export async function reopenAbTest(adminId: string, reason: string): Promise<ReopenResult> {
  if (!adminDb) throw new Error("Database not available")

  const registry = await getExperimentRegistry()
  const now = new Date().toISOString()

  await adminDb
    .collection(REGISTRY_COLLECTION)
    .doc(ALGORITHM_CONFIG_DOC)
    .set({ ab_ended: false, reopened_at: now, reopened_by: adminId }, { merge: true })
  clearAlgorithmConfigCache()

  await adminDb
    .collection(REGISTRY_COLLECTION)
    .doc(REGISTRY_DOC)
    .set(
      {
        status: "rolled_back",
        rolledBackAt: now,
        rolledBackBy: adminId,
        rollbackReason: reason,
        sweep: { ...registry.sweep, inProgress: false, updatedAt: now },
        updatedAt: now,
      },
      { merge: true }
    )

  return { reopenedAt: now, previousStatus: registry.status }
}
