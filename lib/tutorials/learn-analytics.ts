/**
 * Aggregations over `learn_item_responses` (Admin SDK, server-only).
 *
 * WHY THIS FILE EXISTS AT ALL: the audit that motivated the item-response log found the
 * existing Learn funnel events unusable partly because NOTHING READ THEM. Shipping a
 * second write-only store would repeat exactly that mistake, so the log lands with its
 * consumer attached.
 *
 * Three readouts, each answering a question the platform could not previously ask:
 *
 *  1. Item difficulty + DISTRACTOR DISTRIBUTION. Every authored check carries a written
 *     rationale per wrong option, so knowing which wrong option a cohort picks names the
 *     misconception rather than merely counting errors. This is the readout the whole
 *     check-authoring effort exists to produce.
 *  2. Exercise struggle: attempts to first pass, hint reliance, and the error kinds that
 *     dominate. Finds lessons whose exercise is harder than its teach prepared for.
 *  3. Lesson funnel, computed from `user_tutorial_progress` rather than from analytics
 *     events. That collection is written server-side for every signed-in learner, so
 *     unlike the GA4 path it is neither consent-filtered nor client-droppable.
 *
 * De-identification is not optional here: `pseudonymize` is applied at the export
 * boundary so a research extract never carries a real uid.
 */
import { createHash } from "crypto"
import { adminDb } from "@/lib/firebase-admin"
import type { CourseId, LearnItemResponse, TutorialLessonProgress } from "./types"

const RESPONSES = "learn_item_responses"
const PROGRESS = "user_tutorial_progress"

/**
 * Stable pseudonym for a learner. Salted from the environment so an extract cannot be
 * re-identified by anyone who merely knows the uid space and can run sha256.
 */
export function pseudonymize(userId: string): string {
  const salt = process.env.RESEARCH_PSEUDONYM_SALT ?? "codesparring-local-dev-salt"
  return createHash("sha256").update(`${salt}:${userId}`).digest("hex").slice(0, 16)
}

export interface DistractorTally {
  label: string
  count: number
}

export interface ItemDifficulty {
  itemId: string
  lessonId: string
  courseId: CourseId
  skills: string[]
  /** Learners who answered at least once. The denominator for `firstTryAccuracy`. */
  learners: number
  responses: number
  /**
   * Share of learners correct on their FIRST commit (retry_index 0), 0-1. First-try is
   * the honest difficulty measure: checks are freely retryable, so an eventual-correct
   * rate would converge on 1 and rank every item identically.
   */
  firstTryAccuracy: number | null
  /** Wrong options by how often they were chosen, most-picked first. */
  topDistractors: DistractorTally[]
  /** Median milliseconds to first commit, a rough hesitation proxy. */
  medianLatencyMs: number | null
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

/**
 * Per-check difficulty and misconception profile.
 *
 * Counts each learner ONCE per item (their first commit). Without that, a learner who
 * retries five times would contribute five wrong answers and dominate an item's profile,
 * which would make heavily-retried items look far harder than they are.
 */
export function summarizeCheckDifficulty(rows: LearnItemResponse[]): ItemDifficulty[] {
  const byItem = new Map<string, LearnItemResponse[]>()
  for (const row of rows) {
    if (row.kind !== "check_answer") continue
    const list = byItem.get(row.item_id) ?? []
    list.push(row)
    byItem.set(row.item_id, list)
  }

  const out: ItemDifficulty[] = []
  for (const [itemId, itemRows] of byItem) {
    // First commit per learner, by timestamp.
    const firstByUser = new Map<string, LearnItemResponse>()
    for (const row of itemRows) {
      const existing = firstByUser.get(row.user_id)
      if (!existing || row.timestamp < existing.timestamp) firstByUser.set(row.user_id, row)
    }
    const firsts = [...firstByUser.values()]
    const correct = firsts.filter((r) => r.correct === true).length

    const distractors = new Map<string, number>()
    for (const row of firsts) {
      if (row.correct === true) continue
      // predict names the option; classify has no single label, so bucket it as such.
      const label = row.selected_label ?? (row.check_kind === "classify" ? "(misgrouped)" : null)
      if (!label) continue
      distractors.set(label, (distractors.get(label) ?? 0) + 1)
    }

    const sample = itemRows[0]
    out.push({
      itemId,
      lessonId: sample.lesson_id,
      courseId: sample.course_id,
      skills: sample.skills ?? [],
      learners: firsts.length,
      responses: itemRows.length,
      firstTryAccuracy: firsts.length ? correct / firsts.length : null,
      topDistractors: [...distractors.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
      medianLatencyMs: median(
        firsts.map((r) => r.latency_ms).filter((v): v is number => typeof v === "number")
      ),
    })
  }

  // Hardest first: that is the review queue for whoever maintains the curriculum.
  return out.sort((a, b) => (a.firstTryAccuracy ?? 1) - (b.firstTryAccuracy ?? 1))
}

export interface ExerciseStruggle {
  itemId: string
  lessonId: string
  courseId: CourseId
  learners: number
  /** Share of learners who ever passed, 0-1. */
  passRate: number
  /** Median graded runs before a learner's first pass. Null if nobody passed. */
  medianAttemptsToPass: number | null
  /** Share of learners who opened at least one hint, 0-1. */
  hintRate: number
  /** Error kinds by frequency across failed runs, most common first. */
  topErrorKinds: Array<{ kind: string; count: number }>
}

/** Per-exercise difficulty: where learners stall, how long, and on what kind of error. */
export function summarizeExerciseStruggle(rows: LearnItemResponse[]): ExerciseStruggle[] {
  const byItem = new Map<string, LearnItemResponse[]>()
  for (const row of rows) {
    if (row.kind !== "exercise_run" && row.kind !== "hint_reveal") continue
    const list = byItem.get(row.item_id) ?? []
    list.push(row)
    byItem.set(row.item_id, list)
  }

  const out: ExerciseStruggle[] = []
  for (const [itemId, itemRows] of byItem) {
    const runs = itemRows.filter((r) => r.kind === "exercise_run")
    if (runs.length === 0) continue

    const users = new Set(runs.map((r) => r.user_id))
    const hintUsers = new Set(
      itemRows.filter((r) => r.kind === "hint_reveal").map((r) => r.user_id)
    )

    const attemptsToPass: number[] = []
    let passedUsers = 0
    for (const user of users) {
      const theirs = runs
        .filter((r) => r.user_id === user)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      const passIndex = theirs.findIndex((r) => r.passed === true)
      if (passIndex >= 0) {
        passedUsers += 1
        attemptsToPass.push(passIndex + 1)
      }
    }

    const errorKinds = new Map<string, number>()
    for (const run of runs) {
      if (run.passed === true || !run.error_kind) continue
      errorKinds.set(run.error_kind, (errorKinds.get(run.error_kind) ?? 0) + 1)
    }

    const sample = runs[0]
    out.push({
      itemId,
      lessonId: sample.lesson_id,
      courseId: sample.course_id,
      learners: users.size,
      passRate: users.size ? passedUsers / users.size : 0,
      medianAttemptsToPass: median(attemptsToPass),
      hintRate: users.size ? hintUsers.size / users.size : 0,
      topErrorKinds: [...errorKinds.entries()]
        .map(([kind, count]) => ({ kind, count }))
        .sort((a, b) => b.count - a.count),
    })
  }

  return out.sort((a, b) => a.passRate - b.passRate)
}

export interface LessonFunnelRow {
  lessonId: string
  courseId: CourseId
  levelId: number
  started: number
  completed: number
  /** completed / started, 0-1. */
  completionRate: number
}

/**
 * Lesson funnel from the authoritative progress docs.
 *
 * Deliberately NOT computed from the `lesson_started` / `lesson_complete` analytics
 * events: those reach GA4 only, are suppressed for any learner who did not opt into
 * analytics cookies (which default to off), and reach no server collection. A funnel
 * built on them is biased by non-random missingness. Progress docs are written
 * server-side for every signed-in learner, so this number is simply true.
 */
export function summarizeLessonFunnel(progress: TutorialLessonProgress[]): LessonFunnelRow[] {
  const byLesson = new Map<
    string,
    { started: number; completed: number; row: TutorialLessonProgress }
  >()
  for (const doc of progress) {
    const entry = byLesson.get(doc.lessonId) ?? { started: 0, completed: 0, row: doc }
    entry.started += 1
    if (doc.lessonStatus === "completed") entry.completed += 1
    byLesson.set(doc.lessonId, entry)
  }

  return [...byLesson.entries()]
    .map(([lessonId, { started, completed, row }]) => ({
      lessonId,
      courseId: row.courseId ?? "python",
      levelId: row.levelId,
      started,
      completed,
      completionRate: started ? completed / started : 0,
    }))
    .sort((a, b) => a.completionRate - b.completionRate)
}

/** Fetch responses since an ISO cutoff. `consentedOnly` gates research use. */
export async function fetchItemResponses(options: {
  since?: string
  consentedOnly?: boolean
}): Promise<LearnItemResponse[]> {
  let query = adminDb.collection(RESPONSES).limit(50_000) as FirebaseFirestore.Query
  if (options.since) query = query.where("timestamp", ">=", options.since)
  const snap = await query.get()
  const rows = snap.docs.map((d) => d.data() as LearnItemResponse)
  return options.consentedOnly ? rows.filter((r) => r.research_consent === true) : rows
}

/** Fetch all progress docs (funnel input). */
export async function fetchAllProgress(): Promise<TutorialLessonProgress[]> {
  const snap = await adminDb.collection(PROGRESS).limit(50_000).get()
  return snap.docs.map((d) => d.data() as TutorialLessonProgress)
}

/**
 * A de-identified row, safe to leave the building.
 *
 * Drops `id` as well as `user_id`, which is the non-obvious half: the document id is
 * composed as `${userId}_${itemId}_${epochMs}`, so a row with `user_id` removed still
 * carries the raw uid inside its own primary key. Stripping only the obvious field is
 * how de-identification usually fails.
 */
export function deidentify(
  row: LearnItemResponse
): Omit<LearnItemResponse, "user_id" | "id"> & { subject: string; row_id: string } {
  const { user_id, id, ...rest } = row
  const subject = pseudonymize(user_id)
  return {
    ...rest,
    subject,
    // Keep a stable per-row key so an extract can be de-duplicated on re-export,
    // rebuilt from the pseudonym rather than the uid.
    row_id: id.replace(user_id, subject),
  }
}
