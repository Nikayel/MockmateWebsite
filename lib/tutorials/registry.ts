/**
 * Curriculum registry — the single lookup authority over the authored Python content tree.
 * Mirrors `lib/labs/case-labs/index.ts`: pure, synchronous reads over imported content.
 *
 * `getExerciseById` is the bridge to execution: it finds any lesson's `apply`/`practice`
 * exercise by id, which `lib/tutorials/exercise-scenarios.ts` adapts into a runnable `Scenario`.
 */
import { PYTHON_LEVELS } from "./curriculum"
import type {
  PythonExercise,
  PythonLesson,
  PythonLevel,
  PythonLevelId,
  PythonModule,
} from "./types"

export function listLevels(): PythonLevel[] {
  return PYTHON_LEVELS
}

export function getLevel(id: PythonLevelId): PythonLevel | undefined {
  return PYTHON_LEVELS.find((level) => level.id === id)
}

export function getLevelBySlug(slug: PythonLevel["slug"]): PythonLevel | undefined {
  return PYTHON_LEVELS.find((level) => level.slug === slug)
}

export function getModule(levelId: PythonLevelId, moduleId: string): PythonModule | undefined {
  return getLevel(levelId)?.modules.find((mod) => mod.id === moduleId)
}

/**
 * Every lesson across all levels, in curriculum order (level → module → lesson).
 * The ordered spine behind `getLesson` and `getNextLesson`.
 */
export function listAllLessons(): PythonLesson[] {
  return PYTHON_LEVELS.flatMap((level) => level.modules.flatMap((mod) => mod.lessons))
}

export function getLesson(lessonId: string): PythonLesson | undefined {
  return listAllLessons().find((lesson) => lesson.id === lessonId)
}

export function getLessonLocation(
  lessonId: string
): { level: PythonLevel; module: PythonModule; lesson: PythonLesson } | undefined {
  for (const level of PYTHON_LEVELS) {
    for (const mod of level.modules) {
      const lesson = mod.lessons.find((candidate) => candidate.id === lessonId)
      if (lesson) return { level, module: mod, lesson }
    }
  }
  return undefined
}

/** The next lesson in linear curriculum order, or `undefined` at the end. */
export function getNextLesson(lessonId: string): PythonLesson | undefined {
  const lessons = listAllLessons()
  const index = lessons.findIndex((lesson) => lesson.id === lessonId)
  if (index === -1) return undefined
  return lessons[index + 1]
}

/**
 * Find an exercise by id across every lesson's `apply` and `practice`. This is what the
 * execution layer resolves a `scenarioId` against. Returns `undefined` for unknown ids.
 */
export function getExerciseById(exerciseId: string): PythonExercise | undefined {
  for (const lesson of listAllLessons()) {
    if (lesson.apply.id === exerciseId) return lesson.apply
    if (lesson.practice.id === exerciseId) return lesson.practice
  }
  return undefined
}
