/**
 * The exercise corpus must stop being 100 percent "generate a design from a blank page".
 *
 * ## The measurement that started this
 *
 * All 416 System Design exercises were generation tasks and 303 of them opened with the literal
 * word "Design". Generating a plausible architecture from a prompt is the single thing a language
 * model already does perfectly, which makes it the weakest discriminator a 2026 interview has. The
 * genres that DO discriminate are the ones a model is measurably bad at, and both of the first two
 * need to hand the learner an artifact to work ON rather than work FROM:
 *
 *  - CRITIQUE     here is a proposed design, find what is wrong with it
 *  - DIAGNOSIS    here are the symptoms and the graphs, say what is happening
 *
 * That artifact lives in `DesignExercise.supplied`. `design-exercise-supplied.test.tsx` pins that it
 * never reaches the answer buffer. This file pins the CONTENT side: that the artifacts exist, that
 * they are substantial enough to reason about, that they do not hand over the answer they are
 * supposed to hide, and that the model answer actually engages with them.
 *
 * ## Why every check here is about the artifact leaking
 *
 * A critique exercise dies silently. If the supplied design says "reads are served from replicas,
 * which breaks read-your-writes", there is nothing left to find, the learner reads the sentence back,
 * and the exercise scores as complete. Nothing throws, no page looks broken, and the only signal is
 * that the exercise stopped being hard. That is the same shape as the answer-leak defect the DSA
 * statement sweep found (`dsa-statement-spoiler-rule`), and it needs an assertion for the same
 * reason: prose rules drift, tests do not.
 *
 * The pins move in one direction only. `GENERATION_OPENER_PIN` may fall and never rise;
 * `SUPPLIED_FLOOR` may rise and never fall.
 */
import { describe, expect, it } from "vitest"

import { auditSuppliedExercise } from "../exercise-genre-rules"
import { listAllSystemDesignLessons } from "../registry"
import type { DesignExercise } from "@/lib/tutorials/types"

const lessons = listAllSystemDesignLessons()
const exercises: Array<{
  lessonId: string
  phase: "apply" | "practice"
  exercise: DesignExercise
}> = lessons.flatMap((lesson) => [
  { lessonId: lesson.id, phase: "apply" as const, exercise: lesson.apply },
  { lessonId: lesson.id, phase: "practice" as const, exercise: lesson.practice },
])

const withSupplied = exercises.filter((e) => e.exercise.supplied)

/**
 * Exercises whose prompt opens with the word "Design". Ratchets DOWN only.
 *
 * This is a proxy, not the goal. An exercise can be a pure generation task while opening with
 * "Sketch" or "Propose", so driving this number down without changing the genre would be Goodharting
 * it. It is here because it is the number the audit measured, so it is the one that has to be shown
 * moving; `SUPPLIED_FLOOR` is the check that something real replaced them.
 */
const GENERATION_OPENER_PIN = 303

/** Exercises handing the learner a read-only artifact. Ratchets UP only. */
const SUPPLIED_FLOOR = 0

describe("system design exercise genres", () => {
  it("keeps shrinking the share of exercises that open by asking for a design", () => {
    const openers = exercises.filter((e) => /^design\b/i.test(e.exercise.prompt.trim()))
    // A ratchet, not a target. Raising this number is the thing being prevented.
    expect(openers.length).toBeLessThanOrEqual(GENERATION_OPENER_PIN)
  })

  it("hands a read-only artifact to at least the floor number of exercises", () => {
    expect(withSupplied.length).toBeGreaterThanOrEqual(SUPPLIED_FLOOR)
  })

  it("authors every supplied artifact soundly", () => {
    // The rules and their proof-of-sharpness live in `exercise-genre-rules.ts` and its unit test.
    // This applies them to the real corpus; that one shows they catch anything at all.
    const broken = withSupplied.flatMap(({ lessonId, phase, exercise }) =>
      auditSuppliedExercise(exercise).map((problem) => `${lessonId} [${phase}]: ${problem}`)
    )
    expect(broken).toEqual([])
  })

  it("keeps the corpus size fixed while genres change", () => {
    // Genre conversion rewrites exercises in place. Exercise ids are the persistence keys for
    // `user_design_answers`, so a sweep that adds or drops one has done something other than what
    // it was asked to do.
    expect(exercises.length).toBe(416)
    expect(new Set(exercises.map((e) => e.exercise.id)).size).toBe(416)
  })
})
