/**
 * Every authored System Design exercise must be reachable from a surface that renders it.
 *
 * This exists because the opposite shipped for about a year. `SystemDesignLessonPlayer` read
 * `lesson.apply` and nothing else, so all 208 `practice` exercises were authored, bundled, and
 * unreachable to a signed-in learner, and their `modelAnswerOutline`s were reachable from nowhere at
 * all: the public reading page renders practice PROMPTS but `toPublicExercisePreview` seals every
 * model answer. Nothing failed. No test covered "is this content actually rendered anywhere", because
 * that is not a property of the content, and the content tests only look at content.
 *
 * ## Why this reads source text
 *
 * The honest check is "does a rendering surface reference this exercise", and the surfaces are React
 * components whose branches depend on fetched progress, a Zustand store, and a signed-in session.
 * Mounting them to prove a phase exists would test the mocks. Reading the source for the reference is
 * a weaker check, but it is the one that would have caught the actual bug, and it fails loudly the
 * next time someone adds an exercise field that no component consumes.
 *
 * Keep the assertions about REACHABILITY only. How a surface presents an exercise is the component
 * tests' business; that it presents it at all is this file's.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { listAllSystemDesignLessons } from "../registry"

const REPO_ROOT = join(__dirname, "..", "..", "..", "..")

/** Surfaces that are supposed to render an authored exercise, and what each one owes the learner. */
const RENDERING_SURFACES = [
  {
    path: "components/tutorials/SystemDesignLessonPlayer.tsx",
    role: "the signed-in workspace player",
    mustReference: ["lesson.apply", "lesson.practice"],
  },
  {
    path: "components/learn/PublicLessonArticle.tsx",
    role: "the public reading page",
    mustReference: ["preview.apply", "preview.practice"],
  },
]

describe("system design exercise reachability", () => {
  const lessons = listAllSystemDesignLessons()

  it("authors an apply and a practice exercise on every lesson", () => {
    expect(lessons.length).toBe(208)
    const incomplete = lessons
      .filter(
        (lesson) =>
          !lesson.apply?.prompt?.trim() ||
          !lesson.practice?.prompt?.trim() ||
          lesson.practice.modelAnswerOutline.length === 0
      )
      .map((lesson) => lesson.id)
    expect(incomplete).toEqual([])
  })

  for (const surface of RENDERING_SURFACES) {
    it(`${surface.role} renders both exercises`, () => {
      const source = readFileSync(join(REPO_ROOT, surface.path), "utf8")
      const missing = surface.mustReference.filter((reference) => !source.includes(reference))
      expect(
        missing,
        `${surface.path} never references ${missing.join(" or ")}. An exercise a surface does not ` +
          `reference is content the learner cannot reach, which is how 208 practice exercises stayed ` +
          `dark. If a phase was deliberately removed, delete its exercises too rather than shipping ` +
          `content nothing renders.`
      ).toEqual([])
    })
  }

  it("keeps every apply and practice id unique, since answers persist against them", () => {
    // `user_design_answers` is keyed by exercise id, so a collision would have two exercises sharing
    // one saved answer. Practice becoming writable makes this reachable for the first time.
    const ids = lessons.flatMap((lesson) => [lesson.apply.id, lesson.practice.id])
    expect(new Set(ids).size).toBe(ids.length)
  })
})
