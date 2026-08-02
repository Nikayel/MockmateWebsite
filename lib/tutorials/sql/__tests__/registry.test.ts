/**
 * SQL registry invariants — focused on level-scoped navigation. The regression this guards: "Up
 * next" and the in-lesson "Next lesson" button must never silently cross a level boundary. Within a
 * level you advance lesson-to-lesson; at the last lesson the in-level "next" is empty and crossing
 * into the following level is a deliberate hand-off (`getFirstLessonOfNextSqlLevel`).
 */
import { describe, it, expect } from "vitest"
import {
  getFirstLessonOfNextSqlLevel,
  getNextSqlLesson,
  getNextSqlLessonInLevel,
  getSqlLevelBySlug,
  listSqlLessonsInLevel,
  listSqlLevels,
} from "../registry"

describe("sql registry — level-scoped navigation", () => {
  // Ids must be contiguous from 1 and stay inside the shared `TutorialLevelId` 0..11 ceiling, which
  // `tutorialProgressInputSchema`'s literal union mirrors: a level id the schema does not list would
  // make every progress write for that level fail validation.
  it("lists levels with contiguous ids starting at 1, none above 11", () => {
    const ids = listSqlLevels().map((level) => level.id)
    expect(ids).toEqual(Array.from({ length: ids.length }, (_, i) => i + 1))
    expect(Math.max(...ids)).toBeLessThanOrEqual(11)
  })

  it("advances to the next lesson within the same level", () => {
    const level = getSqlLevelBySlug("foundations")
    expect(level).toBeDefined()
    if (!level) return
    const lessons = listSqlLessonsInLevel(level)
    expect(lessons.length).toBeGreaterThan(1)
    expect(getNextSqlLessonInLevel(lessons[0].id)?.id).toBe(lessons[1].id)
  })

  it("stops at the level boundary and never bleeds into the next level (regression)", () => {
    const levels = listSqlLevels()
    const lastLevelId = levels[levels.length - 1].id
    for (const level of levels) {
      const lessons = listSqlLessonsInLevel(level)
      const last = lessons[lessons.length - 1]

      // In-level "next" is undefined at the last lesson of every level...
      expect(getNextSqlLessonInLevel(last.id)).toBeUndefined()

      // ...even though the global linear helper WOULD cross into the next level (the old bug).
      const across = getFirstLessonOfNextSqlLevel(last.id)
      if (level.id === lastLevelId) {
        expect(across).toBeUndefined()
      } else {
        expect(across?.level.id).toBe(level.id + 1)
        // The deliberate hand-off targets the next level's first lesson.
        expect(across?.lesson.id).toBe(getNextSqlLesson(last.id)?.id)
      }
    }
  })

  it("keeps every in-level 'next' inside its own level", () => {
    for (const level of listSqlLevels()) {
      const ids = new Set(listSqlLessonsInLevel(level).map((l) => l.id))
      for (const lesson of listSqlLessonsInLevel(level)) {
        const next = getNextSqlLessonInLevel(lesson.id)
        if (next) expect(ids.has(next.id)).toBe(true)
      }
    }
  })
})
