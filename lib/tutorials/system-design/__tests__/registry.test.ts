/**
 * System Design registry invariants — the regression net the Learn routes depend on. It mirrors the
 * SQL and Python registry tests: the twelve levels stay registered and ordered, slugs round-trip to
 * levels (route resolution), lesson + exercise ids stay globally unique and namespaced, and the
 * in-lesson "next" never silently crosses a level boundary (crossing is the deliberate hand-off
 * `getFirstLessonOfNextSystemDesignLevel`). System Design is the largest course (208 lessons) and its
 * nav helpers back app/learn/system-design/[levelSlug]/[lessonId] + the lesson player, so a
 * duplicated id, a mis-registered level, or a slug typo would break routing with nothing to catch it.
 */
import { describe, it, expect } from "vitest"
import {
  getDesignExerciseById,
  getFirstLessonOfNextSystemDesignLevel,
  getNextSystemDesignLesson,
  getNextSystemDesignLessonInLevel,
  getSystemDesignLessonLocation,
  getSystemDesignLevelBySlug,
  listAllSystemDesignLessons,
  listSystemDesignLessonsInLevel,
  listSystemDesignLevels,
} from "../registry"

const EXPECTED_SLUGS = [
  "interview-method",
  "foundations",
  "data-storage",
  "scaling-data",
  "scaling-compute",
  "distributed-core",
  "event-driven",
  "reliability-ops",
  "security-privacy",
  "modern-architecture",
  "case-studies",
  "specialized-systems",
]

describe("system-design registry — structure & id integrity", () => {
  it("registers twelve levels with ids 0–11 in order", () => {
    expect(listSystemDesignLevels().map((level) => level.id)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ])
  })

  it("round-trips each level slug back to its level (route resolution)", () => {
    const levels = listSystemDesignLevels()
    expect(levels.map((level) => level.slug)).toEqual(EXPECTED_SLUGS)
    for (const level of levels) {
      expect(getSystemDesignLevelBySlug(level.slug)?.id).toBe(level.id)
    }
    expect(getSystemDesignLevelBySlug("no-such-slug")).toBeUndefined()
  })

  it("has 208 lessons with globally-unique, sd- namespaced ids", () => {
    const lessons = listAllSystemDesignLessons()
    expect(lessons).toHaveLength(208)
    const ids = lessons.map((lesson) => lesson.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^sd-l\d+-/.test(id))).toBe(true)
  })

  it("has globally-unique apply + practice exercise ids, all sd- namespaced", () => {
    const exerciseIds = listAllSystemDesignLessons().flatMap((lesson) => [
      lesson.apply.id,
      lesson.practice.id,
    ])
    expect(exerciseIds).toHaveLength(416)
    expect(new Set(exerciseIds).size).toBe(exerciseIds.length)
    expect(exerciseIds.every((id) => id.startsWith("sd-"))).toBe(true)
  })

  it("resolves a lesson's level + module + lesson by id, and an exercise by id", () => {
    const location = getSystemDesignLessonLocation("sd-l0-clarify-scope")
    expect(location).toBeDefined()
    expect(location?.level.id).toBe(0)
    expect(location?.level.slug).toBe("interview-method")
    expect(location?.module.lessons).toContain(location?.lesson)
    expect(location?.lesson.id).toBe("sd-l0-clarify-scope")
    expect(getSystemDesignLessonLocation("sd-l99-nope")).toBeUndefined()

    const first = listAllSystemDesignLessons()[0]
    expect(getDesignExerciseById(first.apply.id)?.id).toBe(first.apply.id)
    expect(getDesignExerciseById(first.practice.id)?.id).toBe(first.practice.id)
    expect(getDesignExerciseById("sd-not-a-real-exercise")).toBeUndefined()
  })
})

describe("system-design registry — level-scoped navigation", () => {
  it("advances to the next lesson within the same level", () => {
    const level = getSystemDesignLevelBySlug("interview-method")
    expect(level).toBeDefined()
    if (!level) return
    const lessons = listSystemDesignLessonsInLevel(level)
    expect(lessons.length).toBeGreaterThan(1)
    expect(getNextSystemDesignLessonInLevel(lessons[0].id)?.id).toBe(lessons[1].id)
  })

  it("stops at the level boundary and never bleeds into the next level (regression)", () => {
    const levels = listSystemDesignLevels()
    const lastLevelId = levels[levels.length - 1].id
    for (const level of levels) {
      const lessons = listSystemDesignLessonsInLevel(level)
      const last = lessons[lessons.length - 1]

      // In-level "next" is undefined at the last lesson of every level...
      expect(getNextSystemDesignLessonInLevel(last.id)).toBeUndefined()

      // ...even though the global linear helper WOULD cross into the next level.
      const across = getFirstLessonOfNextSystemDesignLevel(last.id)
      if (level.id === lastLevelId) {
        expect(across).toBeUndefined()
      } else {
        expect(across?.level.id).toBe(level.id + 1)
        // The deliberate hand-off targets the next level's first lesson.
        expect(across?.lesson.id).toBe(getNextSystemDesignLesson(last.id)?.id)
      }
    }
  })

  it("keeps every in-level 'next' inside its own level", () => {
    for (const level of listSystemDesignLevels()) {
      const ids = new Set(listSystemDesignLessonsInLevel(level).map((lesson) => lesson.id))
      for (const lesson of listSystemDesignLessonsInLevel(level)) {
        const next = getNextSystemDesignLessonInLevel(lesson.id)
        if (next) expect(ids.has(next.id)).toBe(true)
      }
    }
  })
})
