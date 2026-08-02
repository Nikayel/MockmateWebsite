/**
 * Pins the composition rules for item-response rows. These are worth testing without a
 * Firestore round-trip because every one of them is a silent-corruption risk: an
 * `undefined` reaching Firestore throws, an unclamped latency poisons a distribution,
 * and an untruncated assertion string can carry an unbounded blob into the log.
 */
import { describe, it, expect } from "vitest"
import { composeItemResponse, type LearnItemResponseInput } from "../item-responses"

const AT = new Date("2026-08-02T12:00:00.000Z")

function baseInput(overrides: Partial<LearnItemResponseInput> = {}): LearnItemResponseInput {
  return {
    kind: "exercise_run",
    lessonId: "py-l1-loops",
    levelId: 1,
    itemId: "py-l1-loops-apply",
    section: "apply",
    ...overrides,
  } as LearnItemResponseInput
}

describe("composeItemResponse", () => {
  it("never emits an undefined value", () => {
    const row = composeItemResponse("user-1", baseInput(), AT)
    for (const [key, value] of Object.entries(row)) {
      expect(value, `${key} must not be undefined`).not.toBeUndefined()
    }
  })

  it("derives course from the lesson id prefix", () => {
    expect(composeItemResponse("u", baseInput(), AT).course_id).toBe("python")
    expect(composeItemResponse("u", baseInput({ lessonId: "sql-l2-joins" }), AT).course_id).toBe(
      "sql"
    )
    expect(composeItemResponse("u", baseInput({ lessonId: "sd-l3-caching" }), AT).course_id).toBe(
      "system-design"
    )
  })

  it("builds a deterministic id from user, item, and timestamp", () => {
    const a = composeItemResponse("user-1", baseInput(), AT)
    const b = composeItemResponse("user-1", baseInput(), AT)
    expect(a.id).toBe(b.id)
    expect(a.id).toBe(`user-1_py-l1-loops-apply_${AT.getTime()}`)
  })

  it("sanitizes id parts that Firestore would reject", () => {
    // A `/` in a doc id silently creates a subcollection path rather than failing.
    const row = composeItemResponse("user/1", baseInput({ itemId: "py/l1#apply" }), AT)
    expect(row.id).not.toContain("/")
    expect(row.id).toBe(`user_1_py_l1_apply_${AT.getTime()}`)
  })

  it("clamps an absurd latency rather than storing it", () => {
    const row = composeItemResponse("u", baseInput({ latencyMs: 9_000_000 }), AT)
    expect(row.latency_ms).toBe(30 * 60 * 1000)
  })

  it("keeps a zero latency, which is real, not missing", () => {
    const row = composeItemResponse("u", baseInput({ latencyMs: 0 }), AT)
    expect(row.latency_ms).toBe(0)
  })

  it("caps failing assertions at three and truncates each field", () => {
    const row = composeItemResponse(
      "u",
      baseInput({
        failedTests: Array.from({ length: 10 }, (_, i) => ({
          name: `case ${i}`,
          actual: "x".repeat(2000),
        })),
      }),
      AT
    )
    expect(row.failed_tests).toHaveLength(3)
    expect(row.failed_tests?.[0].actual?.length).toBeLessThanOrEqual(501)
  })

  it("omits absent optional groups entirely", () => {
    const row = composeItemResponse("u", baseInput({ kind: "hint_reveal", hintIndex: 2 }), AT)
    expect(row).not.toHaveProperty("check_kind")
    expect(row).not.toHaveProperty("failed_tests")
    expect(row.hint_index).toBe(2)
  })

  it("records a false `correct` rather than dropping it", () => {
    // `correct: false` is the whole point of the row; a truthiness check would lose it.
    const row = composeItemResponse(
      "u",
      baseInput({ kind: "check_answer", checkKind: "predict", correct: false, selectedIndex: 0 }),
      AT
    )
    expect(row.correct).toBe(false)
    expect(row.selected_index).toBe(0)
  })

  it("defaults research consent to false when not supplied", () => {
    expect(composeItemResponse("u", baseInput(), AT).research_consent).toBe(false)
    expect(composeItemResponse("u", baseInput(), AT, true).research_consent).toBe(true)
  })

  it("defaults skills to an empty array so analysis can group without a null check", () => {
    expect(composeItemResponse("u", baseInput(), AT).skills).toEqual([])
    expect(composeItemResponse("u", baseInput({ skills: ["loops"] }), AT).skills).toEqual(["loops"])
  })
})
