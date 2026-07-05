/**
 * System Design curriculum registry — a parallel of `lib/tutorials/sql/registry.ts` over
 * `SYSTEM_DESIGN_LEVELS`. Pure, synchronous reads. Kept parallel (rather than merged into the Python
 * or SQL registry) so those call sites stay untouched — lowest blast radius.
 *
 * Unlike the code courses there is NO execution bridge: `getDesignExerciseById` exists only so the
 * answer-persistence path can resolve a `DesignExercise` by id when hydrating. System design never
 * runs through `lib/tutorials/exercise-scenarios.ts`.
 */
import { SYSTEM_DESIGN_LEVELS } from "./curriculum"
import type {
  DesignExercise,
  DesignLesson,
  DesignLevel,
  DesignModule,
  TutorialLevelId,
} from "@/lib/tutorials/types"

export function listSystemDesignLevels(): DesignLevel[] {
  return SYSTEM_DESIGN_LEVELS
}

export function getSystemDesignLevel(id: TutorialLevelId): DesignLevel | undefined {
  return SYSTEM_DESIGN_LEVELS.find((level) => level.id === id)
}

export function getSystemDesignLevelBySlug(slug: string): DesignLevel | undefined {
  return SYSTEM_DESIGN_LEVELS.find((level) => level.slug === slug)
}

export function getSystemDesignModule(
  levelId: TutorialLevelId,
  moduleId: string
): DesignModule | undefined {
  return getSystemDesignLevel(levelId)?.modules.find((mod) => mod.id === moduleId)
}

/** Every System-Design lesson across all levels, in curriculum order (level → module → lesson). */
export function listAllSystemDesignLessons(): DesignLesson[] {
  return SYSTEM_DESIGN_LEVELS.flatMap((level) => level.modules.flatMap((mod) => mod.lessons))
}

export function getSystemDesignLesson(lessonId: string): DesignLesson | undefined {
  return listAllSystemDesignLessons().find((lesson) => lesson.id === lessonId)
}

export function getSystemDesignLessonLocation(
  lessonId: string
): { level: DesignLevel; module: DesignModule; lesson: DesignLesson } | undefined {
  for (const level of SYSTEM_DESIGN_LEVELS) {
    for (const mod of level.modules) {
      const lesson = mod.lessons.find((candidate) => candidate.id === lessonId)
      if (lesson) return { level, module: mod, lesson }
    }
  }
  return undefined
}

/** The next System-Design lesson in linear curriculum order, or `undefined` at the end. */
export function getNextSystemDesignLesson(lessonId: string): DesignLesson | undefined {
  const lessons = listAllSystemDesignLessons()
  const index = lessons.findIndex((lesson) => lesson.id === lessonId)
  if (index === -1) return undefined
  return lessons[index + 1]
}

/**
 * The next System-Design lesson *within the same level*, or `undefined` at the level's last lesson.
 * "Up next" and the in-lesson "Next lesson" button use this so navigation never silently bleeds into
 * another level — crossing a level boundary is a deliberate step (see
 * {@link getFirstLessonOfNextSystemDesignLevel}), not a linear continuation.
 */
export function getNextSystemDesignLessonInLevel(lessonId: string): DesignLesson | undefined {
  const location = getSystemDesignLessonLocation(lessonId)
  if (!location) return undefined
  const lessonsInLevel = location.level.modules.flatMap((mod) => mod.lessons)
  const index = lessonsInLevel.findIndex((lesson) => lesson.id === lessonId)
  if (index === -1) return undefined
  return lessonsInLevel[index + 1]
}

/** Every System-Design lesson in a level, in curriculum order (module → lesson). */
export function listSystemDesignLessonsInLevel(level: DesignLevel): DesignLesson[] {
  return level.modules.flatMap((mod) => mod.lessons)
}

/**
 * The first lesson of the level immediately after `lessonId`'s level, or `undefined` when the lesson
 * is already in the last level. Powers the deliberate "level complete → start next level" hand-off.
 */
export function getFirstLessonOfNextSystemDesignLevel(
  lessonId: string
): { level: DesignLevel; lesson: DesignLesson } | undefined {
  const location = getSystemDesignLessonLocation(lessonId)
  if (!location) return undefined
  const levelIndex = SYSTEM_DESIGN_LEVELS.findIndex((level) => level.id === location.level.id)
  const nextLevel = levelIndex === -1 ? undefined : SYSTEM_DESIGN_LEVELS[levelIndex + 1]
  const firstLesson = nextLevel && listSystemDesignLessonsInLevel(nextLevel)[0]
  if (!nextLevel || !firstLesson) return undefined
  return { level: nextLevel, lesson: firstLesson }
}

/** Find a design exercise by id across every lesson's `apply` and `practice`. */
export function getDesignExerciseById(exerciseId: string): DesignExercise | undefined {
  for (const lesson of listAllSystemDesignLessons()) {
    if (lesson.apply.id === exerciseId) return lesson.apply
    if (lesson.practice.id === exerciseId) return lesson.practice
    const extra = lesson.extraPractice?.find((ex) => ex.id === exerciseId)
    if (extra) return extra
  }
  return undefined
}
