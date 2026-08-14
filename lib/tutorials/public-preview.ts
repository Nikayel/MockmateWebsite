/**
 * The public projection — the single function that decides what a signed-out visitor may see.
 *
 * ## Why this module exists
 *
 * Every `/learn/**\/[lessonId]` route used to hand the ENTIRE authored lesson to a `"use client"`
 * player, so the RSC flight payload carried each lesson's `referenceSolution`, its `testCases`
 * (expected values included), its hidden workspace files, its SQL seed and assertion SQL, and, for
 * System Design, its `modelAnswerOutline`. That was acceptable only because the whole tree sat
 * behind an auth redirect. The moment the canonical lesson URL became public and statically
 * generated, that payload would have been published to Googlebot and to every scraper, permanently.
 *
 * {@link toPublicLessonPreview} is the seam that makes publishing safe.
 *
 * ## The invariant
 *
 * The returned object is built as a **fresh object literal from an explicit allowlist**. It is never
 * a spread of the authored lesson with fields deleted, never a `JSON.stringify` replacer, and never
 * a denylist. That direction matters: `SqlWorkspaceGrading extends WorkspaceScenarioConfig`
 * (`types.ts`), so a denylist would have to enumerate inherited fields it cannot see, and any field
 * a future author adds to `TeachSection` or to an exercise would be published by default. With an
 * allowlist, a new authored field is invisible until someone deliberately adds it here, and
 * `public-preview-sealing.test.ts` pins that decision against every lesson in the live corpus.
 *
 * ## What is public, and the two judgement calls behind it
 *
 * Public: the whole `teach` section, lesson identity, and the two exercise PROMPTS with their
 * guiding questions and check counts. Gated: anything that grades or answers.
 *
 *  1. `thinkAbout` (System Design) is published. It is defined as ordered *guiding questions*;
 *     `modelAnswerOutline` is the answer. Guiding questions read like the query a searcher typed,
 *     and they are the strongest reading-page hook on the 208 System Design lessons.
 *  2. Inline `cswidget` check answers are published, because they are authored inside
 *     `teach.markdown` and publishing the teach half necessarily publishes them. They are formative,
 *     they reveal on first click to any visitor anyway, and they are the densest question-and-answer
 *     text in the product. The sealing test records this as a named, deliberate exception so nobody
 *     later mistakes it for a leak and strips it in a panic.
 *
 * `teach.demoSeedSql` is safe and deliberate: it is a `TeachSection` field that seeds the *worked
 * example*, structurally distinct from the graded `SqlSingleFileGrading.seedSql`.
 */
import type { DifficultyLevel } from "@/lib/scenarios/types"
import type {
  CourseId,
  DesignExercise,
  PythonExercise,
  SqlExercise,
  TutorialLesson,
  TutorialLevel,
  TutorialLevelId,
} from "./types"

/** The union of every graded payload plugged into the shared content tree. */
export type AuthoredExercise = PythonExercise | SqlExercise | DesignExercise

/** An authored lesson from any of the three courses. */
export type AuthoredLesson = TutorialLesson<AuthoredExercise>

/** An authored level from any of the three courses. */
export type AuthoredLevel = TutorialLevel<AuthoredExercise>

/**
 * What a signed-out reader learns about an exercise: the task, how to think about it, and how much
 * work it is. Everything needed to decide "is this worth signing up for", and nothing that answers it.
 */
export interface PublicExercisePreview {
  /** The authored task statement. A prompt is a question, never a solution. */
  prompt: string
  /** System Design only: ordered guiding questions. Absent for code exercises. */
  thinkAbout?: string[]
  /**
   * System Design only: read-only material the exercise hands the learner, such as the flawed
   * design a critique exercise asks them to review or the symptom timeline an incident-diagnosis
   * exercise starts from.
   *
   * PUBLISHED, and the reasoning is the same one that publishes `prompt` and `thinkAbout`: this is
   * QUESTION material, not answer material. A critique exercise whose flawed design were gated
   * would show a signed-out reader a prompt referring to an artifact they cannot see. The model
   * answer stays gated, which is the line that matters.
   */
  supplied?: { label: string; body: string }
  /** How many hints exist. The hint TEXT is gated; the count is a difficulty signal. */
  hintCount: number
  /**
   * How many automated checks grade the answer. Counted per course: keyed test cases (Python
   * single-file), one result-set comparison (SQL single-file), assertion queries (SQL workspace),
   * or test files (Python workspace). Zero for free-response System Design, which is self-compared.
   */
  gradedCheckCount: number
}

/** The teach section, projected field by field so a newly authored field is not published by default. */
export interface PublicTeachPreview {
  markdown: string
  demoCode?: string
  demoSeedSql?: string
  showDemoInput?: boolean
  estimatedMinutes: number
}

/**
 * Everything the public reading page renders. This type is the contract: if a field is not on it,
 * a signed-out visitor cannot see it.
 */
export interface PublicLessonPreview {
  courseId: CourseId
  levelId: TutorialLevelId
  levelSlug: string
  levelTitle: string
  levelTagline: string
  id: string
  title: string
  summary: string
  estimatedMinutes: number
  difficulty: DifficultyLevel
  skills: string[]
  teach: PublicTeachPreview
  apply: PublicExercisePreview
  practice: PublicExercisePreview
  /** How many optional bonus drills follow the practice problem. Gated content, public count. */
  extraPracticeCount: number
}

/** Hints exist on the two code courses and not on `DesignExercise`; absent means zero. */
function countHints(exercise: AuthoredExercise): number {
  return "hints" in exercise && Array.isArray(exercise.hints) ? exercise.hints.length : 0
}

/**
 * How many automated checks stand between the learner and a pass. Reads only ARRAY LENGTHS and never
 * the contents, so no expected value, assertion SQL, or test source can escape through this path.
 */
function countGradedChecks(exercise: AuthoredExercise): number {
  if ("testCases" in exercise && exercise.testCases) {
    return exercise.testCases.length
  }
  if ("singleFile" in exercise && exercise.singleFile) {
    // One seeded result-set comparison.
    return 1
  }
  if ("workspace" in exercise && exercise.workspace) {
    const workspace = exercise.workspace
    if ("assertions" in workspace && Array.isArray(workspace.assertions)) {
      return workspace.assertions.length
    }
    return workspace.visibleTestPaths.length + workspace.hiddenTestPaths.length
  }
  return 0
}

/** Project one authored exercise onto its public preview. Prompt and counts only. */
function toPublicExercisePreview(exercise: AuthoredExercise): PublicExercisePreview {
  const preview: PublicExercisePreview = {
    prompt: exercise.prompt,
    hintCount: countHints(exercise),
    gradedCheckCount: countGradedChecks(exercise),
  }
  if ("thinkAbout" in exercise && Array.isArray(exercise.thinkAbout)) {
    preview.thinkAbout = exercise.thinkAbout
  }
  // Copied field by field rather than by reference, so a future field added to the authored
  // `supplied` object is invisible here until someone deliberately adds it. Same allowlist
  // direction as the rest of this module.
  if ("supplied" in exercise && exercise.supplied) {
    preview.supplied = { label: exercise.supplied.label, body: exercise.supplied.body }
  }
  return preview
}

/**
 * Project an authored lesson onto the public reading page's model.
 *
 * Takes the level explicitly because `TutorialLesson` carries no course or level identity of its
 * own: the caller resolved the lesson through a registry and already holds its level, and inventing
 * those fields on the lesson type would push course knowledge into shared content types.
 *
 * SECURITY: every field below is written out by hand on purpose. Do not refactor this into a spread
 * plus deletions, and do not add a field here without adding its assertion to the sealing test.
 */
export function toPublicLessonPreview(args: {
  courseId: CourseId
  level: AuthoredLevel
  lesson: AuthoredLesson
}): PublicLessonPreview {
  const { courseId, level, lesson } = args

  const teach: PublicTeachPreview = {
    markdown: lesson.teach.markdown,
    estimatedMinutes: lesson.teach.estimatedMinutes,
  }
  if (lesson.teach.demoCode !== undefined) teach.demoCode = lesson.teach.demoCode
  if (lesson.teach.demoSeedSql !== undefined) teach.demoSeedSql = lesson.teach.demoSeedSql
  if (lesson.teach.showDemoInput !== undefined) teach.showDemoInput = lesson.teach.showDemoInput

  return {
    courseId,
    levelId: level.id,
    levelSlug: level.slug,
    levelTitle: level.title,
    levelTagline: level.tagline,
    id: lesson.id,
    title: lesson.title,
    summary: lesson.summary,
    estimatedMinutes: lesson.estimatedMinutes,
    difficulty: lesson.difficulty,
    skills: lesson.skills,
    teach,
    apply: toPublicExercisePreview(lesson.apply),
    practice: toPublicExercisePreview(lesson.practice),
    extraPracticeCount: lesson.extraPractice?.length ?? 0,
  }
}

/**
 * Field names that must never appear as a KEY anywhere inside a `PublicLessonPreview`, at any depth.
 * Exported so the sealing test and any future reviewer read from one list rather than two.
 */
export const GATED_FIELD_NAMES = [
  "referenceSolution",
  "testCases",
  "workspace",
  "singleFile",
  "modelAnswerOutline",
  // A rubric's "strong" band states the bar an answer has to clear, which is answer content wearing
  // a different noun. It is gated for exactly the reason `modelAnswerOutline` is.
  "rubric",
  "starterAnswer",
  "starterCode",
  "hints",
  "assertions",
  "seedSql",
  "expected",
  "files",
  "referenceFiles",
  "hiddenTestPaths",
  "visibleTestPaths",
] as const
