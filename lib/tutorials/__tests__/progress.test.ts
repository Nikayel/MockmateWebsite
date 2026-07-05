/**
 * Tutorial progress service. Two layers:
 *  - the Zod input schema (the trust boundary — server owns userId/timestamps), and
 *  - the upsert/get compose logic against the centralized Firebase Admin mock (vitest.setup.ts,
 *    where `doc().get()` resolves to a non-existent doc, exercising the create path).
 */
import { describe, it, expect } from "vitest"
import {
  getLessonProgress,
  progressDocId,
  tutorialProgressInputSchema,
  upsertLessonProgress,
} from "../progress"

const validInput = {
  lessonId: "py-l1-temperature",
  levelId: 1,
  sections: { teach: "completed", apply: "completed", practice: "not_started" },
  lessonStatus: "in_progress",
}

describe("tutorialProgressInputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(tutorialProgressInputSchema.safeParse(validInput).success).toBe(true)
  })

  it("accepts optional lastExerciseScore and completedAt", () => {
    const result = tutorialProgressInputSchema.safeParse({
      ...validInput,
      sections: { teach: "completed", apply: "completed", practice: "completed" },
      lessonStatus: "completed",
      lastExerciseScore: 100,
      completedAt: "2026-06-30T12:00:00.000Z",
    })
    expect(result.success).toBe(true)
  })

  it("accepts level 0 (System Design's interview-method level)", () => {
    expect(tutorialProgressInputSchema.safeParse({ ...validInput, levelId: 0 }).success).toBe(true)
  })

  it("accepts level 11 (System Design's last level)", () => {
    expect(tutorialProgressInputSchema.safeParse({ ...validInput, levelId: 11 }).success).toBe(true)
  })

  it("rejects an out-of-range level id", () => {
    // 0–11 span the shared TutorialLevelId range (SD L0-11, SQL L1-5, Python L1-4); 12 is out of range.
    expect(tutorialProgressInputSchema.safeParse({ ...validInput, levelId: 12 }).success).toBe(
      false
    )
    expect(tutorialProgressInputSchema.safeParse({ ...validInput, levelId: -1 }).success).toBe(
      false
    )
  })

  it("rejects an invalid section status", () => {
    const result = tutorialProgressInputSchema.safeParse({
      ...validInput,
      sections: { ...validInput.sections, teach: "skipped" },
    })
    expect(result.success).toBe(false)
  })

  it("rejects a missing lessonId", () => {
    const { lessonId, ...rest } = validInput
    void lessonId
    expect(tutorialProgressInputSchema.safeParse(rest).success).toBe(false)
  })

  it("rejects an out-of-range score", () => {
    expect(
      tutorialProgressInputSchema.safeParse({ ...validInput, lastExerciseScore: 150 }).success
    ).toBe(false)
  })
})

describe("progressDocId", () => {
  it("composes `${uid}__${lessonId}`", () => {
    expect(progressDocId("user-1", "py-l1-temperature")).toBe("user-1__py-l1-temperature")
  })
})

describe("upsertLessonProgress (create path)", () => {
  it("stamps the server-owned userId + timestamps and omits undefined fields", async () => {
    const result = await upsertLessonProgress("user-1", validInput)
    expect(result.userId).toBe("user-1")
    expect(result.lessonId).toBe("py-l1-temperature")
    expect(result.levelId).toBe(1)
    // On create, startedAt and updatedAt are the same stamp.
    expect(result.startedAt).toBe(result.updatedAt)
    expect(typeof result.updatedAt).toBe("string")
    // in_progress → no completedAt; no score provided → omitted (never written as undefined).
    expect("completedAt" in result).toBe(false)
    expect("lastExerciseScore" in result).toBe(false)
  })

  it("sets completedAt and records the score when the lesson is completed", async () => {
    const result = await upsertLessonProgress("user-1", {
      ...validInput,
      sections: { teach: "completed", apply: "completed", practice: "completed" },
      lessonStatus: "completed",
      lastExerciseScore: 100,
    })
    expect(result.lessonStatus).toBe("completed")
    expect(typeof result.completedAt).toBe("string")
    expect(result.lastExerciseScore).toBe(100)
  })
})

describe("getLessonProgress", () => {
  it("returns null when the document does not exist", async () => {
    expect(await getLessonProgress("user-1", "missing-lesson")).toBeNull()
  })
})
