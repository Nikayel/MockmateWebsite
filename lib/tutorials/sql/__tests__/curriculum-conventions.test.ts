/**
 * Structural conventions for the Data Engineering curriculum, enforced across every level.
 *
 * These held by hand across levels 1 to 6 and were rediscovered the hard way while authoring levels
 * 7 and 8 with parallel agents: each one is a rule an author can break silently, because the content
 * still compiles, still renders, and still grades. The reference-solution tests prove an answer key
 * is CORRECT; these prove the surrounding structure is right.
 *
 * Kept separate from `registry.test.ts` (navigation) and the reference-solution suites (grading) so a
 * failure here names the convention that broke rather than a query that mismatched.
 */
import { describe, expect, it } from "vitest"
import { SQL_LEVELS } from "../curriculum"
import type { SqlExercise, SqlLesson } from "@/lib/tutorials/types"

interface LessonRef {
  levelId: number
  lesson: SqlLesson
}

const lessons: LessonRef[] = SQL_LEVELS.flatMap((level) =>
  level.modules.flatMap((mod) => mod.lessons.map((lesson) => ({ levelId: level.id, lesson })))
)

/** Every graded exercise, tagged with the slot it fills. */
const exercises: Array<{
  slot: "apply" | "practice" | "drill"
  lessonId: string
  ex: SqlExercise
}> = lessons.flatMap(({ lesson }) => [
  { slot: "apply" as const, lessonId: lesson.id, ex: lesson.apply },
  { slot: "practice" as const, lessonId: lesson.id, ex: lesson.practice },
  ...(lesson.extraPractice ?? []).map((ex) => ({
    slot: "drill" as const,
    lessonId: lesson.id,
    ex,
  })),
])

describe("Data Engineering curriculum conventions", () => {
  it("has lessons to check", () => {
    expect(lessons.length).toBeGreaterThan(50)
  })

  /**
   * Lesson ids key `user_tutorial_progress` and `learn_item_responses`, and the course each row is
   * filed under is derived from this prefix in `progress.ts` / `item-responses.ts`. A lesson whose id
   * does not match its level would be filed under the wrong course, or (for an unknown prefix)
   * silently under Python.
   */
  it("every lesson id carries the prefix its level owns", () => {
    const wrong = lessons
      .filter(({ levelId, lesson }) => {
        const expected = levelId <= 6 ? `sql-l${levelId}-` : `de-l${levelId}-`
        return !lesson.id.startsWith(expected)
      })
      .map(({ levelId, lesson }) => `${lesson.id} (level ${levelId})`)
    expect(wrong, "levels 1-6 are frozen at sql-, levels 7+ use de-").toEqual([])
  })

  it("every lesson id is unique", () => {
    const ids = lessons.map(({ lesson }) => lesson.id)
    expect(ids.length - new Set(ids).size, "duplicate lesson ids").toBe(0)
  })

  /** The executor uses the exercise id as its scenario id, so a mismatch grades the wrong thing. */
  it("apply and practice exercise ids are derived from the lesson id", () => {
    const wrong = exercises
      .filter(({ slot, lessonId, ex }) => slot !== "drill" && ex.id !== `${lessonId}-${slot}`)
      .map(({ lessonId, slot, ex }) => `${ex.id} should be ${lessonId}-${slot}`)
    expect(wrong).toEqual([])
  })

  it("every exercise id is unique", () => {
    const ids = exercises.map(({ ex }) => ex.id)
    expect(ids.length - new Set(ids).size, "duplicate exercise ids").toBe(0)
  })

  /**
   * The answer-key rule. Apply reveals its reference after a few attempts and drills reveal theirs on
   * demand, so both ship one. Practice never renders a reveal control (`canRevealReference` is passed
   * only for apply and drills in `SqlLessonPlayer`), so a reference there would ship to the client
   * unused and readable in devtools. Practice references are verified out-of-band instead.
   */
  it("apply and drills ship a reference solution", () => {
    const missing = exercises
      .filter(({ slot, ex }) => slot !== "practice" && !ex.referenceSolution?.trim())
      .map(({ ex }) => ex.id)
    expect(missing).toEqual([])
  })

  it("practice never ships a reference solution", () => {
    const leaked = exercises
      .filter(({ slot, ex }) => slot === "practice" && !!ex.referenceSolution)
      .map(({ ex }) => ex.id)
    expect(leaked, "a practice answer key would ride in the client bundle").toEqual([])
  })

  it("every exercise carries the grading payload its execution mode requires", () => {
    const broken = exercises
      .filter(({ ex }) =>
        ex.executionMode === "workspace" ? !ex.workspace : !ex.singleFile || !!ex.workspace
      )
      .map(({ ex }) => `${ex.id} (${ex.executionMode})`)
    expect(broken).toEqual([])
  })

  /** A workspace exercise with no assertions passes for any script, including an empty one. */
  it("every workspace exercise has at least one assertion", () => {
    const unguarded = exercises
      .filter(({ ex }) => ex.executionMode === "workspace" && !ex.workspace?.assertions?.length)
      .map(({ ex }) => ex.id)
    expect(unguarded).toEqual([])
  })

  /** An expected set with no rows passes for any query that returns nothing, including a typo. */
  it("no single-file exercise is graded against an empty result set", () => {
    const degenerate = exercises
      .filter(
        ({ ex }) => ex.executionMode === "single-file" && !ex.singleFile?.expected.rows.length
      )
      .map(({ ex }) => ex.id)
    expect(degenerate).toEqual([])
  })

  /**
   * `checkIdempotency` without `idempotencyTables` compares row counts across ALL user tables on the
   * double run, so any script that legitimately appends (a run log, a landing zone) fails even when
   * correct. Levels 3 to 5 predate the scoping field and pass because their scripts are whole-table
   * rebuilds, so this is scoped to the levels authored after it existed.
   */
  it("idempotency-checked workspace exercises in levels 7+ scope the tables they compare", () => {
    const unscoped = lessons
      .filter(({ levelId }) => levelId >= 7)
      .flatMap(({ lesson }) => [lesson.apply, lesson.practice, ...(lesson.extraPractice ?? [])])
      .filter((ex) => ex.workspace?.checkIdempotency && !ex.workspace.idempotencyTables?.length)
      .map((ex) => ex.id)
    expect(unscoped, "set idempotencyTables to the tables that must be stable").toEqual([])
  })

  it("every lesson teaches before it grades", () => {
    const empty = lessons
      .filter(({ lesson }) => (lesson.teach.markdown?.trim().length ?? 0) < 200)
      .map(({ lesson }) => lesson.id)
    expect(empty, "teach body missing or too short to teach anything").toEqual([])
  })

  it("every teach body closes its code fences", () => {
    const unbalanced = lessons
      .filter(({ lesson }) => (lesson.teach.markdown.match(/```/g)?.length ?? 0) % 2 !== 0)
      .map(({ lesson }) => lesson.id)
    expect(unbalanced).toEqual([])
  })
})
