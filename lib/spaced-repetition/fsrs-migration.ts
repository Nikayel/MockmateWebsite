/**
 * SM-2 → FSRS card conversion (one-time A/B teardown migration)
 *
 * Converts an SM-2-scheduled problem_mastery doc into an equivalent FSRS card
 * WITHOUT changing when the card comes due. Unlike the lossy read-time
 * fallback (reconstructFSRSCardFromFields, which flattens every card to
 * difficulty 5), this preserves the per-user difficulty signal accumulated in
 * SM-2's ease_factor.
 *
 * Pure logic only — the batch orchestrator lives alongside but all conversion
 * math is side-effect free and unit-tested.
 */

import { FieldPath, type DocumentReference } from "firebase-admin/firestore"

import { adminDb } from "../firebase-admin"
import { createFSRSCard, type FSRSCard } from "./fsrs-algorithm"

/** Minimum stability we will seed; FSRS misbehaves at 0. */
const MIN_SEED_STABILITY = 0.5

/** SM-2 ease bounds (see sm2-algorithm.ts). */
const SM2_MIN_EASE = 1.3
const SM2_MAX_EASE = 2.5

/** FSRS difficulty bounds. */
const FSRS_MIN_DIFFICULTY = 1
const FSRS_MAX_DIFFICULTY = 10

export interface Sm2CardFields {
  ease_factor?: number
  interval_days: number
  review_count: number
  next_review_at: string
  last_reviewed_at?: string
  fsrs_lapses?: number
  fsrs_state?: string
}

/**
 * True when the doc already carries a valid serialized FSRS card.
 * This is the migration's idempotency guard: such cards are never touched.
 * Corrupt JSON is treated as absent, matching reconstructState's catch path.
 */
export function hasValidFsrsState(data: Pick<Sm2CardFields, "fsrs_state">): boolean {
  if (!data.fsrs_state) return false
  try {
    const parsed: unknown = JSON.parse(data.fsrs_state)
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { stability?: unknown }).stability === "number"
    )
  } catch {
    return false
  }
}

/**
 * Map SM-2 ease_factor (1.3 hard … 2.5 easy) onto FSRS difficulty
 * (10 hard … 1 easy), inverse-linear with clamping.
 *
 * SM-2's ease is the accumulated per-card difficulty signal; FSRS difficulty
 * is its direct analogue with inverted polarity. Mapping the full range
 * preserves the ORDERING of which cards this user finds hard, which is the
 * property the learner model and scheduler actually consume.
 *
 * Caveat (accepted): a fresh card still at ease 2.5 maps to difficulty 1
 * rather than FSRS's ~5 init value. Ease 2.5 genuinely means "never
 * penalized", and FSRS difficulty self-corrects within a few reviews.
 */
export function mapEaseToFsrsDifficulty(easeFactor: number): number {
  const ease = Math.min(SM2_MAX_EASE, Math.max(SM2_MIN_EASE, easeFactor))
  const normalized = (SM2_MAX_EASE - ease) / (SM2_MAX_EASE - SM2_MIN_EASE) // 0 easy … 1 hard
  const difficulty = FSRS_MIN_DIFFICULTY + normalized * (FSRS_MAX_DIFFICULTY - FSRS_MIN_DIFFICULTY)
  return Math.min(FSRS_MAX_DIFFICULTY, Math.max(FSRS_MIN_DIFFICULTY, difficulty))
}

/**
 * Convert an SM-2 card's fields into an FSRS card.
 *
 * Returns null when the card already has a valid FSRS blob (idempotent skip).
 *
 * Schedule preservation: nextReview is taken verbatim from next_review_at and
 * lastReview from last_reviewed_at — the card comes due exactly when SM-2 said
 * it would; only the memory-model representation changes.
 *
 * Stability ≈ interval_days: at desiredRetention 0.9 the FSRS interval is
 * approximately the stability, so seeding stability with the SM-2 interval
 * preserves the schedule's meaning without rescaling. (SM-2 caps intervals at
 * 180d, below FSRS's 365d maximum, so no cap interaction.)
 */
export function convertSm2CardToFsrs(data: Sm2CardFields, now: Date = new Date()): FSRSCard | null {
  if (hasValidFsrsState(data)) return null

  const nextReview = new Date(data.next_review_at)

  if (!data.review_count || data.review_count <= 0) {
    // Never reviewed: a genuinely new FSRS card, keeping its due date.
    const card = createFSRSCard(now)
    return { ...card, nextReview }
  }

  const lastReview = data.last_reviewed_at ? new Date(data.last_reviewed_at) : null
  const elapsedDays = lastReview
    ? Math.max(0, Math.floor((now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  return {
    difficulty: mapEaseToFsrsDifficulty(data.ease_factor ?? SM2_MAX_EASE),
    stability: Math.max(data.interval_days || 1, MIN_SEED_STABILITY),
    state: data.interval_days >= 1 ? "review" : "learning",
    lastReview,
    nextReview,
    reps: data.review_count,
    lapses: data.fsrs_lapses ?? 0,
    learningSteps: 0,
    elapsedDays,
    scheduledDays: data.interval_days,
  }
}

/**
 * Firestore update payload for a converted card.
 *
 * Mirrors prepareStateForStorage's FSRS fields only. SM-2 fields
 * (ease_factor, interval_days, next_review_at, review_count, mastery_level)
 * are deliberately untouched: they stay correct as denormalized data and act
 * as a rollback trail.
 */
export function buildFsrsCardUpdate(card: FSRSCard): Record<string, unknown> {
  return {
    fsrs_state: JSON.stringify(card),
    fsrs_difficulty: card.difficulty,
    fsrs_stability: card.stability,
    fsrs_lapses: card.lapses,
  }
}

// ============================================
// Batch orchestrator
// ============================================

export interface MigrateAllOptions {
  /** Count everything but write nothing. */
  dryRun?: boolean
  /** Profiles fetched per Firestore page. */
  pageSize?: number
  /** Max users processed in this invocation (serverless-budget bound). */
  maxUsers?: number
  /** Resume after this profile doc id (from a prior result's nextCursor). */
  cursor?: string
}

export interface MigrateAllResult {
  usersScanned: number
  usersFlippedToFsrs: number
  usersAlreadyFsrs: number
  usersOverriddenSkipped: number
  cardsConverted: number
  cardsSkipped: number
  errors: Array<{ userId: string; message: string }>
  /** Non-null when more users remain: pass back as options.cursor. */
  nextCursor: string | null
  dryRun: boolean
}

/** Firestore hard-caps batches at 500 ops; stay under with headroom. */
const MAX_BATCH_OPS = 400

/**
 * Accumulates update ops and commits in chunks of MAX_BATCH_OPS.
 * In dry-run mode it only counts and never touches Firestore.
 */
class BatchWriter {
  private batch: FirebaseFirestore.WriteBatch | null = null
  private pendingOps = 0

  constructor(private readonly dryRun: boolean) {}

  async update(ref: DocumentReference, data: Record<string, unknown>): Promise<void> {
    if (this.dryRun) return
    if (!this.batch) this.batch = adminDb.batch()
    this.batch.update(ref, data)
    this.pendingOps++
    if (this.pendingOps >= MAX_BATCH_OPS) await this.flush()
  }

  async flush(): Promise<void> {
    if (this.batch && this.pendingOps > 0) {
      await this.batch.commit()
    }
    this.batch = null
    this.pendingOps = 0
  }
}

/**
 * Sweep all profiles: convert every blob-less card to FSRS and flip
 * non-overridden users' arm to fsrs.
 *
 * Properties:
 * - Resumable: pages profiles by document id; returns nextCursor when the
 *   maxUsers budget is exhausted before the collection is.
 * - Idempotent: converted cards are skipped via hasValidFsrsState, already-
 *   fsrs users via the arm check — a re-run converges to all-zero counts,
 *   which doubles as the completion check.
 * - Card conversion also applies to fsrs-arm users' blob-less legacy cards
 *   (upgrades read-time-fallback seeds), and to overridden sm2 users (adding
 *   fsrs_* fields is additive; SM-2 scheduling ignores them).
 * - Per-user failures are recorded and do not abort the sweep.
 *
 * Deliberately does NOT write the global config doc — the admin route
 * finalizes via markAbTestEnded only after the last page completes.
 */
export async function migrateAllUsersToFsrs(
  options: MigrateAllOptions = {}
): Promise<MigrateAllResult> {
  const { dryRun = false, pageSize = 100, maxUsers = 100, cursor } = options

  const result: MigrateAllResult = {
    usersScanned: 0,
    usersFlippedToFsrs: 0,
    usersAlreadyFsrs: 0,
    usersOverriddenSkipped: 0,
    cardsConverted: 0,
    cardsSkipped: 0,
    errors: [],
    nextCursor: null,
    dryRun,
  }

  const writer = new BatchWriter(dryRun)
  let lastProcessedId: string | undefined = cursor
  let exhausted = false

  while (result.usersScanned < maxUsers && !exhausted) {
    const pageLimit = Math.min(pageSize, maxUsers - result.usersScanned)
    let query = adminDb.collection("profiles").orderBy(FieldPath.documentId()).limit(pageLimit)
    if (lastProcessedId) query = query.startAfter(lastProcessedId)

    const page = await query.get()
    if (page.empty) {
      exhausted = true
      break
    }

    for (const profileDoc of page.docs) {
      result.usersScanned++
      lastProcessedId = profileDoc.id
      try {
        await migrateSingleUser(profileDoc, writer, result)
      } catch (error) {
        result.errors.push({
          userId: profileDoc.id,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (page.docs.length < pageLimit) exhausted = true
  }

  await writer.flush()
  result.nextCursor = exhausted ? null : (lastProcessedId ?? null)
  return result
}

async function migrateSingleUser(
  profileDoc: FirebaseFirestore.QueryDocumentSnapshot,
  writer: BatchWriter,
  result: MigrateAllResult
): Promise<void> {
  const userId = profileDoc.id
  const profile = profileDoc.data() as {
    spaced_repetition_algorithm?: string
    algorithm_user_overridden?: boolean
  }

  // 1) Convert this user's blob-less cards (all arms — additive for sm2).
  const cardsSnap = await adminDb
    .collection("problem_mastery")
    .doc(userId)
    .collection("problems")
    .get()

  for (const cardDoc of cardsSnap.docs) {
    const data = cardDoc.data() as Partial<Sm2CardFields>
    // Docs without SR scheduling state (e.g. legacy session-metrics-shaped
    // records lacking next_review_at) cannot be converted meaningfully.
    if (typeof data.next_review_at !== "string") {
      result.cardsSkipped++
      continue
    }
    const converted = convertSm2CardToFsrs(data as Sm2CardFields)
    if (converted) {
      await writer.update(cardDoc.ref, buildFsrsCardUpdate(converted))
      result.cardsConverted++
    } else {
      result.cardsSkipped++
    }
  }

  // 2) Flip the arm unless the user explicitly chose theirs.
  if (profile.spaced_repetition_algorithm === "fsrs") {
    result.usersAlreadyFsrs++
    return
  }
  if (profile.algorithm_user_overridden === true) {
    result.usersOverriddenSkipped++
    return
  }

  await writer.update(profileDoc.ref, {
    spaced_repetition_algorithm: "fsrs",
    algorithm_migrated_at: new Date().toISOString(),
    algorithm_migrated_from: profile.spaced_repetition_algorithm ?? "unassigned",
  })
  result.usersFlippedToFsrs++
}
