/**
 * Level-path model — the pure, course-agnostic computation behind the level's "guided path" lesson
 * list (`components/tutorials/LevelPathView`). It answers the three questions the screen exists to
 * answer: where am I, what's next, how much is left.
 *
 * Two steps, deliberately split:
 *  - {@link toLevelListModel} projects an authored `TutorialLevel<E>` down to a lean, serializable
 *    list model (no exercise payloads / markdown), so a Server Component can hand the client view
 *    only what a list needs.
 *  - {@link computeLevelPath} overlays the user's completed-lesson set to derive per-lesson status,
 *    per-section counts, overall progress, minutes remaining, and the Continue (resume) target.
 *
 * Both courses share the generic `TutorialLevel<E>` skeleton, so this logic is written once and
 * reused by the Python and SQL level pages — only `basePath` / `courseLabel` differ.
 */
import type { DifficultyLevel } from "@/lib/scenarios/types"
import type { TutorialLesson, TutorialLevel, TutorialLevelId } from "./types"

// ---- slim, serializable list model (projected from authored content) ----

export interface LessonListItem {
  id: string
  title: string
  summary: string
  estimatedMinutes: number
  difficulty: DifficultyLevel
}

export interface SectionListItem {
  id: string
  title: string
  description: string
  lessons: LessonListItem[]
}

export interface LevelListModel {
  id: number
  slug: string
  title: string
  tagline: string
  sections: SectionListItem[]
}

/** Project an authored level onto the lean model the list view needs (drops exercises + markdown). */
export function toLevelListModel(level: TutorialLevel<unknown>): LevelListModel {
  return {
    id: level.id,
    slug: level.slug,
    title: level.title,
    tagline: level.tagline,
    sections: level.modules.map((mod) => ({
      id: mod.id,
      title: mod.title,
      description: mod.description,
      lessons: mod.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        summary: lesson.summary,
        estimatedMinutes: lesson.estimatedMinutes,
        difficulty: lesson.difficulty,
      })),
    })),
  }
}

// ---- lean Path-landing summary (Level selector / preview / resume) ----

/** One lesson projected to only what the Path landing reads: id (completion + nav) + skills (chips). */
export interface PathLessonSummary {
  id: string
  skills: string[]
}

/**
 * A level projected to only what the Path landing renders (LevelSelector, LevelPreviewPanel,
 * LevelCard, ResumeLearning): identity, tagline, hour estimate, and a flat lesson list carrying just
 * the completion/nav id + the preview chip skills. Deliberately drops `modules` and every exercise
 * payload (starter code, reference solutions, tests) so the full authored `PythonLevel[]` never
 * serializes to the client.
 */
export interface PathLevelSummary<Id extends TutorialLevelId = TutorialLevelId> {
  id: Id
  slug: string
  title: string
  tagline: string
  estimatedHours: number
  lessons: PathLessonSummary[]
}

/** Project an authored level onto the lean Path summary (drops modules + exercise payloads). */
export function toPathLevelSummary<Id extends TutorialLevelId>(
  level: TutorialLevel<unknown, Id>
): PathLevelSummary<Id> {
  return {
    id: level.id,
    slug: level.slug,
    title: level.title,
    tagline: level.tagline,
    estimatedHours: level.estimatedHours,
    lessons: level.modules.flatMap((mod) =>
      mod.lessons.map((lesson) => ({ id: lesson.id, skills: lesson.skills }))
    ),
  }
}

// ---- computed path model (list model + the user's completion overlay) ----

/**
 * The meaningful states a lesson card can render — a real status, not a decorative circle.
 * `current` is the single resume target. Every lesson is freely navigable (no gating): future
 * lessons render as `open`, so a learner can jump anywhere.
 */
export type LessonCardStatus = "done" | "current" | "open"

export interface LessonPathNode {
  item: LessonListItem
  /** 1-based running index across the whole level (reads like a path sequence). */
  index: number
  status: LessonCardStatus
  /** Destination — always navigable. */
  href: string
}

export type SectionStatusDot = "complete" | "in_progress" | "untouched"

export interface SectionPathNode {
  id: string
  title: string
  description: string
  lessons: LessonPathNode[]
  done: number
  total: number
  status: SectionStatusDot
}

export interface LevelPathModel {
  sections: SectionPathNode[]
  total: number
  done: number
  /** Rounded 0–100. */
  percent: number
  /** Sum of the remaining (not-done) lessons' estimated minutes. */
  minutesLeft: number
  /** The resume affordance: first incomplete lesson. `null` once the level is complete or empty. */
  continueTarget: { href: string; lessonId: string; lessonTitle: string } | null
  isComplete: boolean
  isEmpty: boolean
}

/**
 * Overlay completion onto the list model to produce the full path model.
 *
 * No gating: every lesson is navigable. A completed lesson is `done`; the first incomplete lesson is
 * `current` (the resume target and Continue destination); every other incomplete lesson is `open`.
 */
export function computeLevelPath(
  model: LevelListModel,
  completed: ReadonlySet<string>,
  basePath: string
): LevelPathModel {
  const flat = model.sections.flatMap((section) => section.lessons)
  const total = flat.length
  const done = flat.filter((lesson) => completed.has(lesson.id)).length
  const firstIncompleteIndex = flat.findIndex((lesson) => !completed.has(lesson.id))
  const minutesLeft = flat
    .filter((lesson) => !completed.has(lesson.id))
    .reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0)

  // Assign a status + href per lesson, threading a running 1-based index across sections.
  let runningIndex = 0
  const idToGlobalIndex = new Map(flat.map((lesson, i) => [lesson.id, i]))

  const statusFor = (lessonId: string): LessonCardStatus => {
    if (completed.has(lessonId)) return "done"
    const i = idToGlobalIndex.get(lessonId) ?? 0
    return i === firstIncompleteIndex ? "current" : "open"
  }

  const sections: SectionPathNode[] = model.sections.map((section) => {
    const lessons: LessonPathNode[] = section.lessons.map((item) => {
      runningIndex += 1
      return {
        item,
        index: runningIndex,
        status: statusFor(item.id),
        href: `${basePath}/${model.slug}/${item.id}`,
      }
    })
    const sectionDone = lessons.filter((l) => l.status === "done").length
    const containsCurrent = lessons.some((l) => l.status === "current")
    const sectionTotal = lessons.length
    const status: SectionStatusDot =
      sectionTotal > 0 && sectionDone === sectionTotal
        ? "complete"
        : sectionDone > 0 || containsCurrent
          ? "in_progress"
          : "untouched"
    return {
      id: section.id,
      title: section.title,
      description: section.description,
      lessons,
      done: sectionDone,
      total: sectionTotal,
      status,
    }
  })

  const current = firstIncompleteIndex === -1 ? null : flat[firstIncompleteIndex]!
  const continueTarget = current
    ? {
        href: `${basePath}/${model.slug}/${current.id}`,
        lessonId: current.id,
        lessonTitle: current.title,
      }
    : null

  return {
    sections,
    total,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    minutesLeft,
    continueTarget,
    isComplete: total > 0 && done === total,
    isEmpty: total === 0,
  }
}

// ---- lean lesson-player model (projected + resolved server-side) ----

/**
 * The minimal level fields a lesson player renders: id (the LEVEL badge + progress collection key),
 * slug (route links), and title (the level-complete card). Deliberately drops `modules` so no
 * exercise payloads / model answers ship to the client — the whole point of resolving the single
 * lesson server-side.
 */
export interface LeanTutorialLevel<Id extends TutorialLevelId = TutorialLevelId> {
  id: Id
  slug: string
  title: string
}

/** Project an authored level onto the lean fields a lesson player needs (drops modules/exercises). */
export function toLeanLevel<Id extends TutorialLevelId = TutorialLevelId>(
  level: TutorialLevel<unknown, Id>
): LeanTutorialLevel<Id> {
  return { id: level.id, slug: level.slug, title: level.title }
}

/**
 * A following lesson within the same level, for the workspace "Up next" list. Completion is NOT
 * carried here: it is overlaid client-side from the user's progress (`useCompletedLessons`), so this
 * ref stays a pure, serializable content projection.
 */
export interface UpNextLessonRef {
  id: string
  title: string
  levelSlug: string
}

/**
 * Where the post-Practice CTA points: the next in-level lesson, a deliberate level-complete hand-off
 * at a boundary, or the end of the path. Crossing a level is never a silent linear continuation.
 */
export type LessonNextStep<Id extends TutorialLevelId = TutorialLevelId> =
  | { kind: "lesson"; id: string; title: string; slug: string }
  | {
      kind: "level-complete"
      id: string
      title: string
      slug: string
      levelId: Id
      levelTitle: string
    }
  | { kind: "finished" }

/** Serializable per-lesson navigation, computed server-side from a course registry's resolved reads. */
export interface LessonNavModel<Id extends TutorialLevelId = TutorialLevelId> {
  lessonNumber: number
  totalInLevel: number
  upNext: UpNextLessonRef[]
  nextStep: LessonNextStep<Id>
}

/** How many following lessons the workspace "Up next" list shows. */
export const UP_NEXT_COUNT = 5

/**
 * Build the lean navigation model a lesson player needs from registry-resolved pieces. Kept pure and
 * course-agnostic: each route passes its own registry results (the in-level lesson list, the next
 * in-level lesson, and the first lesson of the next level) so the exact in-level ordering and the
 * deliberate level-boundary hand-off are preserved unchanged — this helper only projects, it never
 * recomputes the "next" logic the registries own.
 */
export function buildLessonNav<E, Id extends TutorialLevelId>(args: {
  level: TutorialLevel<E, Id>
  lessonId: string
  lessonsInLevel: TutorialLesson<E>[]
  nextInLevel: TutorialLesson<E> | undefined
  firstOfNextLevel: { level: TutorialLevel<E, Id>; lesson: TutorialLesson<E> } | undefined
}): LessonNavModel<Id> {
  const idx = args.lessonsInLevel.findIndex((lesson) => lesson.id === args.lessonId)
  const upNext: UpNextLessonRef[] = args.lessonsInLevel
    .slice(idx + 1, idx + 1 + UP_NEXT_COUNT)
    .map((lesson) => ({ id: lesson.id, title: lesson.title, levelSlug: args.level.slug }))

  let nextStep: LessonNextStep<Id>
  if (args.nextInLevel) {
    nextStep = {
      kind: "lesson",
      id: args.nextInLevel.id,
      title: args.nextInLevel.title,
      slug: args.level.slug,
    }
  } else if (args.firstOfNextLevel) {
    nextStep = {
      kind: "level-complete",
      id: args.firstOfNextLevel.lesson.id,
      title: args.firstOfNextLevel.lesson.title,
      slug: args.firstOfNextLevel.level.slug,
      levelId: args.firstOfNextLevel.level.id,
      levelTitle: args.firstOfNextLevel.level.title,
    }
  } else {
    nextStep = { kind: "finished" }
  }

  return {
    lessonNumber: idx + 1,
    totalInLevel: args.lessonsInLevel.length,
    upNext,
    nextStep,
  }
}
