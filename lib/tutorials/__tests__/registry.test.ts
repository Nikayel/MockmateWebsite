/**
 * Invariants the tutorial registry must hold: five levels, working lookups, linear progression,
 * and — the rule the execution layer depends on — globally unique lesson and exercise ids.
 */
import { describe, it, expect } from "vitest"
import {
  getExerciseById,
  getFirstLessonOfNextLevel,
  getLesson,
  getLessonLocation,
  getLevel,
  getLevelBySlug,
  getModule,
  getNextLesson,
  getNextLessonInLevel,
  listAllLessons,
  listLessonsInLevel,
  listLevels,
} from "../registry"
import type { PythonLevelId } from "../types"

describe("tutorial registry", () => {
  it("lists five levels with ids 1-5", () => {
    expect(listLevels().map((level) => level.id)).toEqual([1, 2, 3, 4, 5])
  })

  it("looks up a level by id and by slug", () => {
    expect(getLevel(1)?.slug).toBe("fundamentals")
    expect(getLevelBySlug("applied")?.id).toBe(3)
    expect(getLevelBySlug("engineering")?.id).toBe(4)
    expect(getLevel(9 as PythonLevelId)).toBeUndefined()
  })

  it("resolves a known lesson and its location", () => {
    expect(getLesson("py-l1-temperature")?.title).toBeTruthy()
    const location = getLessonLocation("py-l1-temperature")
    expect(location?.level.id).toBe(1)
    expect(location?.module.lessons).toContain(location?.lesson)
  })

  it("returns undefined for unknown lessons and modules", () => {
    expect(getLesson("nope")).toBeUndefined()
    expect(getLessonLocation("nope")).toBeUndefined()
    expect(getModule(1, "nope")).toBeUndefined()
    expect(getModule(1, "py-l1-fundamentals")?.title).toBeTruthy()
  })

  it("resolves exercises by id across apply + practice", () => {
    expect(getExerciseById("py-l1-temperature-apply")?.executionMode).toBe("single-file")
    expect(getExerciseById("py-l1-temperature-practice")?.executionMode).toBe("single-file")
    expect(getExerciseById("py-l3-parse-config-practice")?.executionMode).toBe("workspace")
    expect(getExerciseById("nope")).toBeUndefined()
  })

  it("walks lessons in linear curriculum order", () => {
    const lessons = listAllLessons()
    expect(lessons.length).toBeGreaterThan(0)
    if (lessons.length > 1) {
      expect(getNextLesson(lessons[0].id)?.id).toBe(lessons[1].id)
    }
    expect(getNextLesson(lessons[lessons.length - 1].id)).toBeUndefined()
    expect(getNextLesson("nope")).toBeUndefined()
  })

  it("scopes 'next lesson in level' to the level and stops at its last lesson", () => {
    for (const level of listLevels()) {
      const inLevel = listLessonsInLevel(level)
      expect(inLevel.length).toBeGreaterThan(0)
      // Every non-last lesson points to the next lesson IN THE SAME LEVEL.
      for (let i = 0; i < inLevel.length - 1; i++) {
        expect(getNextLessonInLevel(inLevel[i].id)?.id).toBe(inLevel[i + 1].id)
      }
      // The level's last lesson has no in-level successor — the level hand-off takes over.
      expect(getNextLessonInLevel(inLevel[inLevel.length - 1].id)).toBeUndefined()
    }
    expect(getNextLessonInLevel("nope")).toBeUndefined()
  })

  it("hands off to the first lesson of the next level only at a level boundary", () => {
    const levels = listLevels()
    for (let i = 0; i < levels.length; i++) {
      const inLevel = listLessonsInLevel(levels[i])
      const lastId = inLevel[inLevel.length - 1].id
      const firstId = inLevel[0].id
      const handoff = getFirstLessonOfNextLevel(lastId)
      if (i < levels.length - 1) {
        // From a level's last lesson, the hand-off is the NEXT level's first lesson.
        expect(handoff?.level.id).toBe(levels[i + 1].id)
        expect(handoff?.lesson.id).toBe(listLessonsInLevel(levels[i + 1])[0].id)
      } else {
        // The final level has no next level.
        expect(handoff).toBeUndefined()
      }
      // A non-boundary lesson (the level's first) still resolves its own next-level correctly, but
      // the player only consults this once `getNextLessonInLevel` returns undefined.
      expect(getFirstLessonOfNextLevel(firstId)?.level.id).toBe(handoff?.level.id)
    }
    expect(getFirstLessonOfNextLevel("nope")).toBeUndefined()
  })

  it("has globally unique lesson and exercise ids", () => {
    const lessons = listAllLessons()
    const lessonIds = lessons.map((lesson) => lesson.id)
    expect(new Set(lessonIds).size).toBe(lessonIds.length)

    const exerciseIds = lessons.flatMap((lesson) => [lesson.apply.id, lesson.practice.id])
    expect(new Set(exerciseIds).size).toBe(exerciseIds.length)
  })
})
