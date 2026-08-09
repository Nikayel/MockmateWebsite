/**
 * The accepted level range has one owner (`level-id-schema`), because the two
 * endpoints that persist a `levelId` write to different collections and used to
 * restate the range separately. If they ever disagree, a learner's lesson
 * progress saves while the telemetry for the same action is rejected, and the
 * attempt trajectory is lost without an error anyone sees.
 *
 * These tests pin the range itself and pin that both request schemas derive
 * from it, so widening `TutorialLevelId` cannot land in only one of them.
 */
import { describe, it, expect } from "vitest"
import { tutorialLevelIdSchema } from "../level-id-schema"
import { tutorialProgressInputSchema } from "../progress"
import { learnItemResponseInputSchema } from "../item-responses"
import type { TutorialLevelId } from "../types"

/** Every value the `TutorialLevelId` union admits, listed independently of it. */
const ALL_LEVEL_IDS: TutorialLevelId[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

describe("tutorialLevelIdSchema", () => {
  it("accepts every level in the TutorialLevelId range", () => {
    for (const levelId of ALL_LEVEL_IDS) {
      expect(tutorialLevelIdSchema.safeParse(levelId).success).toBe(true)
    }
  })

  it("rejects values outside the range and non-integers", () => {
    for (const bad of [-1, 12, 1.5, "3", null, undefined]) {
      expect(tutorialLevelIdSchema.safeParse(bad).success).toBe(false)
    }
  })
})

describe("both levelId trust boundaries share the range", () => {
  const progressInput = (levelId: unknown) => ({
    lessonId: "sd-l0-m1",
    levelId,
    sections: { teach: "completed", apply: "not_started", practice: "not_started" },
    lessonStatus: "in_progress",
  })

  const itemResponseInput = (levelId: unknown) => ({
    kind: "check_answer" as const,
    lessonId: "sd-l0-m1",
    levelId,
    itemId: "check-1",
    section: "teach" as const,
  })

  it("accepts the same levels on both", () => {
    for (const levelId of ALL_LEVEL_IDS) {
      expect(tutorialProgressInputSchema.safeParse(progressInput(levelId)).success).toBe(true)
      expect(learnItemResponseInputSchema.safeParse(itemResponseInput(levelId)).success).toBe(true)
    }
  })

  it("rejects the same out-of-range levels on both", () => {
    for (const bad of [-1, 12]) {
      expect(tutorialProgressInputSchema.safeParse(progressInput(bad)).success).toBe(false)
      expect(learnItemResponseInputSchema.safeParse(itemResponseInput(bad)).success).toBe(false)
    }
  })
})
