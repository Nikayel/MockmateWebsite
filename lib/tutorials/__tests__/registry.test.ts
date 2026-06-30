/**
 * Invariants the tutorial registry must hold: four levels, working lookups, linear progression,
 * and — the rule the execution layer depends on — globally unique lesson and exercise ids.
 */
import { describe, it, expect } from "vitest"
import {
  getExerciseById,
  getLesson,
  getLessonLocation,
  getLevel,
  getLevelBySlug,
  getModule,
  getNextLesson,
  listAllLessons,
  listLevels,
} from "../registry"
import type { PythonLevelId } from "../types"

describe("tutorial registry", () => {
  it("lists four levels with ids 1–4", () => {
    expect(listLevels().map((level) => level.id)).toEqual([1, 2, 3, 4])
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

  it("has globally unique lesson and exercise ids", () => {
    const lessons = listAllLessons()
    const lessonIds = lessons.map((lesson) => lesson.id)
    expect(new Set(lessonIds).size).toBe(lessonIds.length)

    const exerciseIds = lessons.flatMap((lesson) => [lesson.apply.id, lesson.practice.id])
    expect(new Set(exerciseIds).size).toBe(exerciseIds.length)
  })
})
