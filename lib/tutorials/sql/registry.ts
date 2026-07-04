/**
 * SQL curriculum registry — a parallel of `lib/tutorials/registry.ts` over `SQL_LEVELS`. Pure,
 * synchronous reads. Kept parallel (rather than merged into the Python registry) so Python call
 * sites stay untouched — lowest blast radius (SPEC §6). `getSqlExerciseById` is the bridge to
 * execution: `lib/tutorials/exercise-scenarios.ts` adapts the found exercise into a runnable Scenario.
 */
import { SQL_LEVELS } from "./curriculum"
import type {
  SqlExercise,
  SqlLesson,
  SqlLevel,
  SqlModule,
  TutorialLevelId,
} from "@/lib/tutorials/types"

export function listSqlLevels(): SqlLevel[] {
  return SQL_LEVELS
}

export function getSqlLevel(id: TutorialLevelId): SqlLevel | undefined {
  return SQL_LEVELS.find((level) => level.id === id)
}

export function getSqlLevelBySlug(slug: string): SqlLevel | undefined {
  return SQL_LEVELS.find((level) => level.slug === slug)
}

export function getSqlModule(levelId: TutorialLevelId, moduleId: string): SqlModule | undefined {
  return getSqlLevel(levelId)?.modules.find((mod) => mod.id === moduleId)
}

/** Every SQL lesson across all levels, in curriculum order (level → module → lesson). */
export function listAllSqlLessons(): SqlLesson[] {
  return SQL_LEVELS.flatMap((level) => level.modules.flatMap((mod) => mod.lessons))
}

export function getSqlLesson(lessonId: string): SqlLesson | undefined {
  return listAllSqlLessons().find((lesson) => lesson.id === lessonId)
}

export function getSqlLessonLocation(
  lessonId: string
): { level: SqlLevel; module: SqlModule; lesson: SqlLesson } | undefined {
  for (const level of SQL_LEVELS) {
    for (const mod of level.modules) {
      const lesson = mod.lessons.find((candidate) => candidate.id === lessonId)
      if (lesson) return { level, module: mod, lesson }
    }
  }
  return undefined
}

/** The next SQL lesson in linear curriculum order, or `undefined` at the end. */
export function getNextSqlLesson(lessonId: string): SqlLesson | undefined {
  const lessons = listAllSqlLessons()
  const index = lessons.findIndex((lesson) => lesson.id === lessonId)
  if (index === -1) return undefined
  return lessons[index + 1]
}

/**
 * The next SQL lesson *within the same level*, or `undefined` at the level's last lesson.
 * "Up next" and the in-lesson "Next lesson" button use this so navigation never silently bleeds
 * into another level — crossing a level boundary is a deliberate step (see
 * {@link getFirstLessonOfNextSqlLevel}), not a linear continuation.
 */
export function getNextSqlLessonInLevel(lessonId: string): SqlLesson | undefined {
  const location = getSqlLessonLocation(lessonId)
  if (!location) return undefined
  const lessonsInLevel = location.level.modules.flatMap((mod) => mod.lessons)
  const index = lessonsInLevel.findIndex((lesson) => lesson.id === lessonId)
  if (index === -1) return undefined
  return lessonsInLevel[index + 1]
}

/** Every SQL lesson in a level, in curriculum order (module → lesson). */
export function listSqlLessonsInLevel(level: SqlLevel): SqlLesson[] {
  return level.modules.flatMap((mod) => mod.lessons)
}

/**
 * The first lesson of the level immediately after `lessonId`'s level, or `undefined` when the lesson
 * is already in the last level. Powers the deliberate "level complete → start next level" hand-off.
 */
export function getFirstLessonOfNextSqlLevel(
  lessonId: string
): { level: SqlLevel; lesson: SqlLesson } | undefined {
  const location = getSqlLessonLocation(lessonId)
  if (!location) return undefined
  const levelIndex = SQL_LEVELS.findIndex((level) => level.id === location.level.id)
  const nextLevel = levelIndex === -1 ? undefined : SQL_LEVELS[levelIndex + 1]
  const firstLesson = nextLevel && listSqlLessonsInLevel(nextLevel)[0]
  if (!nextLevel || !firstLesson) return undefined
  return { level: nextLevel, lesson: firstLesson }
}

/** Find a SQL exercise by id across every lesson's `apply` and `practice`. */
export function getSqlExerciseById(exerciseId: string): SqlExercise | undefined {
  for (const lesson of listAllSqlLessons()) {
    if (lesson.apply.id === exerciseId) return lesson.apply
    if (lesson.practice.id === exerciseId) return lesson.practice
  }
  return undefined
}
