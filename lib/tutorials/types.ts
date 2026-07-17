/**
 * Tutorial curriculum — content tree + exercise + progress types.
 *
 * The Level → Module → Lesson → (Read/Apply/Practice) skeleton is genuinely identical across
 * courses, so it is **generic over the exercise payload** (`TutorialLevel<E>` etc.). Only the graded
 * `exercise` shape diverges per course: `PythonExercise` (single-file `testCases` / workspace files)
 * vs `SqlExercise` (seeded result-set compare / seeded assertion queries). Python keeps its concrete
 * aliases (`PythonLevel = TutorialLevel<PythonExercise>`, …) so no Python call site churns.
 *
 * Two distinct concerns live here:
 *  - **Authored content** (`PythonLevel`/`SqlLevel` → Module → Lesson). Static, imported, never
 *    user-specific.
 *  - **Per-user progress** (`TutorialLessonProgress`), owned by the server (userId + timestamps are
 *    never trusted from the client). 100% shared across courses — namespaced by `lessonId`.
 *
 * Exercises deliberately reuse the EXACT field shapes the executor already understands
 * (`DSAScenario.testCases` / `WorkspaceScenarioConfig` for Python; a seeded result set / assertion
 * queries for SQL) so grading needs zero new execution code — see `lib/tutorials/exercise-scenarios.ts`.
 */
import type { DifficultyLevel, WorkspaceScenarioConfig } from "@/lib/scenarios/types"

// ---- shared, course-agnostic skeleton ----

export type CourseId = "python" | "sql" | "system-design"

/**
 * SQL ships 6 levels (L5 is the advanced/company-specific DE-interview capstone; L6 is the
 * Cloud & Data Engineering Foundations level); Python ships 4;
 * System Design ships 12 levels numbered **L0–L11** (L0 is the "Interview & Communication Method").
 * `PythonLevelId` stays pinned to 1-4 so Python-only maps (e.g. `LEVEL_PREVIEWS`) are not forced to
 * grow, while the shared `TutorialLevelId` (used by `TutorialLessonProgress.levelId` and the SQL /
 * System-Design level ids) spans the full 0..11 range. Widening it is a type-only change — the
 * serialized shape is unaffected and the progress Zod schema widens in lockstep.
 */
export type TutorialLevelId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
export type PythonLevelId = 1 | 2 | 3 | 4

/** The three phases of every lesson — the spine of the learning loop. */
export type LessonSection = "teach" | "apply" | "practice"

export type ExerciseExecutionMode = "single-file" | "workspace"

/** Teach: pure reading + an optional non-graded runnable demo. */
export interface TeachSection {
  /** Self-contained explanation, rendered by `MarkdownRenderer`. */
  markdown: string
  /** Optional snippet the learner can Run to "see it work" (no grading). */
  demoCode?: string
  /**
   * SQL lessons only: a seed DB so `demoCode` can be executed LIVE to show its output table, rather
   * than hand-authoring a result that would silently drift. When present alongside a SELECT
   * `demoCode`, the Read phase runs it and renders the returned rows. (Python teach omits this.)
   */
  demoSeedSql?: string
  /** SQL lessons only: also render the seeded input tables above the demo output. */
  showDemoInput?: boolean
  estimatedMinutes: number
}

/** A lesson, generic over its graded-exercise payload `E`. */
export interface TutorialLesson<E> {
  /** e.g. `"py-l1-temperature"` / `"sql-l1-select-columns"`. */
  id: string
  title: string
  /** One line, for the module list. */
  summary: string
  estimatedMinutes: number
  /** Reuses the shared `"easy" | "medium" | "hard"`. */
  difficulty: DifficultyLevel
  /** Browse/filter tags. */
  skills: string[]
  teach: TeachSection
  /** Guided exercise: more hints; reference revealed after a few attempts. */
  apply: E
  /** Combined challenge: hidden reference + (workspace) hidden tests. */
  practice: E
  /**
   * Optional bonus drills for the practice phase, ordered easy → hard. Rendered below the main
   * practice problem as "Extra practice (optional)"; they do NOT gate lesson completion, so the
   * progress model is unchanged. Each is graded independently by the same runner. Absent on most
   * lessons.
   */
  extraPractice?: E[]
}

export interface TutorialModule<E> {
  /** e.g. `"py-l1-fundamentals"`. */
  id: string
  title: string
  description: string
  lessons: TutorialLesson<E>[]
}

export interface TutorialLevel<E, Id extends TutorialLevelId = TutorialLevelId> {
  id: Id
  slug: string
  /** e.g. `"Level 1 — Python Fundamentals"`. */
  title: string
  tagline: string
  /**
   * Which runner a level's exercises default to. Optional because not every course executes: the
   * System-Design course is free-response (no runner), so its levels omit this rather than carry a
   * bogus value. Python (L1/L2 `"single-file"`, L3/L4 `"workspace"`) and SQL always set it.
   */
  defaultExecutionMode?: ExerciseExecutionMode
  estimatedHours: number
  modules: TutorialModule<E>[]
}

// ---- Python course (concrete instantiation — no call-site changes) ----

/**
 * A single keyed test case for single-file grading. Shape matches `DSAScenario.testCases`
 * (`lib/scenarios/types.ts`) so `/api/execute` runs it unchanged — but typed more strictly here
 * (`input` is a keyed arg map, `expected` is `unknown`) to keep authored content honest.
 */
export interface PythonTestCase {
  /** KEYED args: argument-name → value, e.g. `{ f: 212 }`. See ARCHITECTURE.md §4. */
  input: Record<string, unknown>
  expected: unknown
  description: string
  /** For order-insensitive array outputs. */
  orderMatters?: boolean
  /** For set-like comparison. */
  compareAsSet?: boolean
}

/**
 * A graded Python exercise. Mirrors `DSAScenario.testCases` (single-file) and
 * `WorkspaceScenarioConfig` (workspace) so the existing executor grades it with no new code.
 */
export interface PythonExercise {
  /** Namespaced id, e.g. `"py-l1-temperature-apply"`. Used directly as the executor `scenarioId`. */
  id: string
  /** Markdown task description. */
  prompt: string
  executionMode: ExerciseExecutionMode
  /** single-file: editor seed. workspace: ignored (the workspace `files` carry the seed). */
  starterCode: string
  hints: string[]
  /** single-file model answer (gated reveal). */
  referenceSolution?: string

  /** single-file grading — required when `executionMode === "single-file"`. */
  testCases?: PythonTestCase[]

  /** workspace grading — required when `executionMode === "workspace"`. */
  workspace?: WorkspaceScenarioConfig
}

export type PythonLevelSlug = "fundamentals" | "intermediate" | "applied" | "engineering"

export type PythonLesson = TutorialLesson<PythonExercise>
export type PythonModule = TutorialModule<PythonExercise>
export type PythonLevel = TutorialLevel<PythonExercise, PythonLevelId>

// ---- SQL course (concrete instantiation) ----

/** A tabular result: row-major `rows`, column order matches `columns`. */
export interface SqlResultSet {
  columns: string[]
  rows: unknown[][]
}

/**
 * Runtime guard for {@link SqlResultSet}. A graded run's `actual`/`expected` can be a non-result-set
 * sentinel (the shared result mapper's "fail" string) on an errored query, so callers must narrow
 * before handing the value to a table renderer — otherwise a failing query throws in render. Checks
 * BOTH `columns` and `rows` are arrays so a half-formed object can't slip through.
 */
export function isSqlResultSet(value: unknown): value is SqlResultSet {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { columns?: unknown }).columns) &&
    Array.isArray((value as { rows?: unknown }).rows)
  )
}

/** Single-query grading (L1/L2): seed a DB, run the learner's SELECT, compare to one expected set. */
export interface SqlSingleFileGrading {
  /** DDL + DML run once to build the DB the learner queries. */
  seedSql: string
  /** The single expected result set for the reference SELECT. */
  expected: SqlResultSet
  /** true → row order must match (learner used ORDER BY). Default false → compare as multiset. */
  orderMatters?: boolean
  /** true → string cell comparison is case-insensitive. Default false. */
  caseInsensitive?: boolean
  /**
   * true → the learner's column NAMES must match `expected.columns` (case-insensitive). Set on lessons
   * where aliasing is the graded skill so an unaliased answer with the right values still fails.
   */
  assertColumnNames?: boolean
}

/** One hidden assertion query — the dbt "count of violations = 0" convention (zero rows = pass). */
export interface SqlAssertion {
  suite: string
  name: string
  /** Query that MUST return zero rows on success. */
  sql: string
  isHidden?: boolean
}

/**
 * Script/workspace grading (L3/L4). **Extends `WorkspaceScenarioConfig`** so the reused (git-clean)
 * `WorkspaceExerciseRunner` renders the SQL script as its single editable file exactly like a Python
 * workspace lesson; `seedSql` / `assertions` / `checkIdempotency` ride alongside for the grader.
 */
export interface SqlWorkspaceGrading extends WorkspaceScenarioConfig {
  /** DDL + DML run once before the learner's script. */
  seedSql: string
  /** Run AFTER the learner's multi-statement script, in order. Zero rows returned = pass. */
  assertions: SqlAssertion[]
  /** true → the grader runs the learner script twice and asserts a stable result (idempotency). */
  checkIdempotency?: boolean
  /**
   * When set, the idempotency double-run compares the CONTENT (all rows, order-independent) of exactly
   * these graded tables between run 1 and run 2 — so a learner's scratch/staging tables don't perturb
   * the check and a value-only change that preserves the row count is still caught. Omitted → falls
   * back to summing row counts across all user tables.
   */
  idempotencyTables?: string[]
}

/** A graded SQL exercise. Mirrors `PythonExercise` (id-as-scenarioId, gated reference, mode union). */
export interface SqlExercise {
  /** `sql-l{N}-{slug}-{apply|practice}` — used directly as the executor scenarioId. */
  id: string
  prompt: string
  executionMode: ExerciseExecutionMode
  /** single-file: editor seed SQL. workspace: initial script (the editable file's content). */
  starterCode: string
  hints: string[]
  /** single-file model answer (gated reveal on Apply; never present on Practice). */
  referenceSolution?: string

  /** single-file grading — required when `executionMode === "single-file"`. */
  singleFile?: SqlSingleFileGrading

  /** workspace grading — required when `executionMode === "workspace"`. */
  workspace?: SqlWorkspaceGrading
}

export type SqlLevelSlug =
  | "foundations"
  | "aggregation"
  | "modeling"
  | "engineering"
  | "advanced-company-sql"
  | "cloud-data-foundations"

export type SqlLesson = TutorialLesson<SqlExercise>
export type SqlModule = TutorialModule<SqlExercise>
export type SqlLevel = TutorialLevel<SqlExercise>

// ---- System Design course (concrete instantiation) ----

/**
 * A free-response system-design exercise — the third payload plugged into the shared content tree,
 * the mirror image of `PythonExercise` / `SqlExercise`. It has **no** execution fields at all
 * (`executionMode`, `starterCode`-grading, `testCases`, `seedSql`, `workspace`): system design is
 * not code-graded. The learner reads the concept, writes a free-text design answer, saves it, then
 * reveals the `modelAnswerOutline` to self-compare. The saved answer is persisted separately in the
 * `user_design_answers` collection keyed by `id` (see `lib/tutorials/design-answers.ts`).
 */
export interface DesignExercise {
  /** `sd-l{N}-{slug}-{apply|practice}`. Stable; used as the answer-persistence key. */
  id: string
  /**
   * Markdown prompt. MUST lead with the deliverable ("Write...", "Design...", "Explain how you
   * would...") per the content style rules.
   */
  prompt: string
  /** Guiding questions shown beside the editor to structure thinking. Ordered. */
  thinkAbout: string[]
  /**
   * The model answer, revealed on demand (never auto-shown), rendered as a bullet list. Built from
   * the curriculum map's `modelAnswerOutline`. No auto-grading — the learner self-compares.
   */
  modelAnswerOutline: string[]
  /** Optional seed text for the answer editor (e.g. a scaffold the learner fills in). */
  starterAnswer?: string
}

/** The twelve System-Design level slugs (L0–L11), verbatim from `CURRICULUM-MAP.md`. */
export type SystemDesignLevelSlug =
  | "interview-method" // L0
  | "foundations" // L1
  | "data-storage" // L2
  | "scaling-data" // L3
  | "scaling-compute" // L4
  | "distributed-core" // L5
  | "event-driven" // L6
  | "reliability-ops" // L7
  | "security-privacy" // L8
  | "modern-architecture" // L9
  | "case-studies" // L10
  | "specialized-systems" // L11

export type DesignLesson = TutorialLesson<DesignExercise>
export type DesignModule = TutorialModule<DesignExercise>
export type DesignLevel = TutorialLevel<DesignExercise>

// ---- progress (per-user state — 100% shared across courses) ----

export type SectionStatus = "not_started" | "in_progress" | "completed"

/**
 * Per-user, per-lesson progress. Persisted at `user_tutorial_progress/${uid}__${lessonId}`.
 * `userId` and timestamps are SERVER-owned — never trusted from the client. Course-agnostic: the
 * `lessonId` prefix (`py-` / `sql-`) namespaces the two courses in one collection.
 */
export interface TutorialLessonProgress {
  userId: string
  lessonId: string
  levelId: TutorialLevelId
  /** Optional per-course tag for clean dashboards; absent ⇒ `"python"` (backfill-free). */
  courseId?: CourseId
  sections: Record<LessonSection, SectionStatus>
  /** `"completed"` once `practice` is completed. */
  lessonStatus: SectionStatus
  /** % of tests passed on the most recent `practice` run. */
  lastExerciseScore?: number
  /** ISO timestamp. */
  startedAt: string
  /** ISO timestamp. */
  updatedAt: string
  /** ISO timestamp; omitted while not completed (Firestore rejects `undefined`). */
  completedAt?: string
}
