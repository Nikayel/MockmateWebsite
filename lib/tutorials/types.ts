/**
 * Python curriculum — content tree + exercise + progress types.
 *
 * Two distinct concerns live here:
 *  - **Authored content** (`PythonLevel` → `PythonModule` → `PythonLesson`), mirroring how
 *    `CaseLab` content is authored. Static, imported, never user-specific.
 *  - **Per-user progress** (`TutorialLessonProgress`), mirroring `CaseLabRun`. Owned by the
 *    server (userId + timestamps are never trusted from the client).
 *
 * Exercises deliberately reuse the EXACT field shapes the executor already understands
 * (`DSAScenario.testCases` for single-file, `WorkspaceScenarioConfig` for workspace) so grading
 * needs zero new execution code — see `lib/tutorials/exercise-scenarios.ts`.
 */
import type { DifficultyLevel, WorkspaceScenarioConfig } from "@/lib/scenarios/types"

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
  estimatedMinutes: number
}

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
 * A graded exercise. Mirrors `DSAScenario.testCases` (single-file) and `WorkspaceScenarioConfig`
 * (workspace) so the existing executor grades it with no new code.
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

export interface PythonLesson {
  /** e.g. `"py-l1-temperature"`. */
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
  apply: PythonExercise
  /** Combined challenge: hidden reference + (workspace) hidden tests. */
  practice: PythonExercise
}

export interface PythonModule {
  /** e.g. `"py-l1-fundamentals"`. */
  id: string
  title: string
  description: string
  lessons: PythonLesson[]
}

export type PythonLevelSlug = "fundamentals" | "intermediate" | "applied" | "engineering"

export interface PythonLevel {
  id: PythonLevelId
  slug: PythonLevelSlug
  /** e.g. `"Level 1 — Python Fundamentals"`. */
  title: string
  tagline: string
  /** L1/L2 default to `"single-file"`, L3/L4 to `"workspace"`. */
  defaultExecutionMode: ExerciseExecutionMode
  estimatedHours: number
  modules: PythonModule[]
}

// ---- progress (per-user state) ----

export type SectionStatus = "not_started" | "in_progress" | "completed"

/**
 * Per-user, per-lesson progress. Persisted at `user_tutorial_progress/${uid}__${lessonId}`.
 * `userId` and timestamps are SERVER-owned — never trusted from the client.
 */
export interface TutorialLessonProgress {
  userId: string
  lessonId: string
  levelId: PythonLevelId
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
