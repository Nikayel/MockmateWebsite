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
import type { TutorialLevel } from "./types"

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

// ---- computed path model (list model + the user's completion overlay) ----

/**
 * The four meaningful states a lesson card can render — a real status, not a decorative circle.
 * `current` is the single resume target; `locked` is sequentially gated and not navigable.
 */
export type LessonCardStatus = "done" | "current" | "open" | "locked"

export interface LessonPathNode {
  item: LessonListItem
  /** 1-based running index across the whole level (reads like a path sequence). */
  index: number
  status: LessonCardStatus
  /** Destination when navigable; `null` for a locked lesson. */
  href: string | null
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
 * Gating rule: a lesson is navigable when it is done, or it is the first lesson, or the lesson
 * immediately before it is done. Among the navigable-but-incomplete lessons, the earliest one is
 * `current` (the resume target); any later navigable-incomplete lesson is `open` (this arises when a
 * learner has completed lessons out of order). Everything else is `locked`. This keeps the path
 * guided without ever hard-locking a lesson whose prerequisite is already met.
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
    const prevDone = i === 0 || completed.has(flat[i - 1]!.id)
    if (!prevDone) return "locked"
    return i === firstIncompleteIndex ? "current" : "open"
  }

  const sections: SectionPathNode[] = model.sections.map((section) => {
    const lessons: LessonPathNode[] = section.lessons.map((item) => {
      runningIndex += 1
      const status = statusFor(item.id)
      return {
        item,
        index: runningIndex,
        status,
        href: status === "locked" ? null : `${basePath}/${model.slug}/${item.id}`,
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
