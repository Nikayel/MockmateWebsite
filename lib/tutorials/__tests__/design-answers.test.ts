/**
 * System-Design saved-answer service. Mirrors `progress.test.ts`:
 *  - the Zod input schema (the trust boundary — server owns userId/timestamps, and the `sd-` prefix
 *    is enforced so this route can only write the System-Design namespace), and
 *  - the upsert/get compose logic against the centralized Firebase Admin mock (vitest.setup.ts,
 *    where `doc().get()` resolves to a non-existent doc, exercising the create path). The foreign-doc
 *    ownership path overrides the collection mock once to return a doc owned by another user.
 */
import { describe, it, expect, vi } from "vitest"
import { adminDb } from "@/lib/firebase-admin"
import {
  designAnswerDocId,
  designAnswerInputSchema,
  getDesignAnswer,
  upsertDesignAnswer,
} from "../design-answers"

const validInput = {
  exerciseId: "sd-l0-clarify-scope-apply",
  lessonId: "sd-l0-clarify-scope",
  answer:
    "First I would separate the product ask from the system ask, then confirm scale and read/write mix.",
}

describe("designAnswerInputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(designAnswerInputSchema.safeParse(validInput).success).toBe(true)
  })

  it("rejects an exerciseId that is not sd- prefixed (namespace guard)", () => {
    expect(
      designAnswerInputSchema.safeParse({ ...validInput, exerciseId: "sql-l1-select-apply" })
        .success
    ).toBe(false)
  })

  it("rejects a lessonId that is not sd- prefixed", () => {
    expect(
      designAnswerInputSchema.safeParse({ ...validInput, lessonId: "py-l1-temperature" }).success
    ).toBe(false)
  })

  it("rejects an over-length answer", () => {
    expect(
      designAnswerInputSchema.safeParse({ ...validInput, answer: "x".repeat(20_001) }).success
    ).toBe(false)
  })

  it("rejects a missing exerciseId", () => {
    const { exerciseId, ...rest } = validInput
    void exerciseId
    expect(designAnswerInputSchema.safeParse(rest).success).toBe(false)
  })
})

describe("designAnswerDocId", () => {
  it("composes `${uid}__${exerciseId}`", () => {
    expect(designAnswerDocId("user-1", "sd-l0-clarify-scope-apply")).toBe(
      "user-1__sd-l0-clarify-scope-apply"
    )
  })
})

describe("upsertDesignAnswer (create path)", () => {
  it("stamps the server-owned userId + timestamps on create", async () => {
    const result = await upsertDesignAnswer("user-1", validInput)
    expect(result.userId).toBe("user-1")
    expect(result.exerciseId).toBe("sd-l0-clarify-scope-apply")
    expect(result.lessonId).toBe("sd-l0-clarify-scope")
    expect(result.answer).toBe(validInput.answer)
    // On create, startedAt and updatedAt are the same stamp.
    expect(result.startedAt).toBe(result.updatedAt)
    expect(typeof result.updatedAt).toBe("string")
  })

  it("does not carry any extra/undefined fields (only the documented shape)", async () => {
    const result = await upsertDesignAnswer("user-1", validInput)
    expect(Object.keys(result).sort()).toEqual(
      ["answer", "exerciseId", "lessonId", "startedAt", "updatedAt", "userId"].sort()
    )
  })
})

describe("upsertDesignAnswer (ownership)", () => {
  it("throws UNAUTHORIZED when an existing doc is owned by another user", async () => {
    // Override the collection mock once so the existing doc is owned by someone else.
    vi.mocked(adminDb.collection).mockReturnValueOnce({
      doc: vi.fn(() => ({
        get: vi.fn(() =>
          Promise.resolve({
            exists: true,
            data: () => ({ userId: "someone-else", exerciseId: validInput.exerciseId }),
          })
        ),
        set: vi.fn(() => Promise.resolve()),
      })),
    } as unknown as ReturnType<typeof adminDb.collection>)

    await expect(upsertDesignAnswer("user-1", validInput)).rejects.toThrow("UNAUTHORIZED")
  })
})

describe("getDesignAnswer", () => {
  it("returns null when the document does not exist", async () => {
    expect(await getDesignAnswer("user-1", "sd-missing-apply")).toBeNull()
  })
})
