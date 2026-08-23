/**
 * Pins that conversation history reaches the model WHOLE.
 *
 * This used to be a sliding window capped at 30 messages, and the cap is what
 * produced the 2026-08-22 session where the interviewer probed one thread seven
 * times: a 43-message conversation lost its first 13, so the earlier probes on
 * that thread were no longer visible to the model being asked not to repeat
 * itself. Message count is not a safety valve here - GPT-5.6 Luna carries a
 * 1,050,000-token context and an interview is 20-30K - so the only bound left is
 * on the size of a single message.
 *
 * If a future change reintroduces a count-based cap, these fail. That is the
 * point: re-add one only with a reason written down that outranks the above.
 */

import { describe, expect, it } from "vitest"
import { manageContextWindow, MAX_MESSAGE_LENGTH } from "../context-window"

/** A conversation longer than every window this module has ever had. */
function conversation(length: number): Array<{ type: string; message: string }> {
  return Array.from({ length }, (_, i) => ({
    type: i % 2 === 0 ? "user" : "model",
    message: `message ${i}`,
  }))
}

describe("manageContextWindow", () => {
  it("keeps every message in a conversation longer than the old 30-message cap", () => {
    const result = manageContextWindow(conversation(43))

    expect(result).toHaveLength(43)
    expect(result[0].message).toBe("message 0")
    expect(result[42].message).toBe("message 42")
  })

  it("preserves order and role across the whole conversation", () => {
    const result = manageContextWindow(conversation(100))

    expect(result.map((m) => m.message)).toEqual(conversation(100).map((m) => m.message))
    expect(result.map((m) => m.type)).toEqual(conversation(100).map((m) => m.type))
  })

  it("never injects a summary placeholder for dropped messages", () => {
    const result = manageContextWindow(conversation(200))

    expect(result.some((m) => m.message.includes("summarized"))).toBe(false)
    expect(result).toHaveLength(200)
  })

  it("still truncates a single oversized message", () => {
    const huge = "x".repeat(MAX_MESSAGE_LENGTH * 3)
    const result = manageContextWindow([{ type: "user", message: huge }])

    expect(result).toHaveLength(1)
    expect(result[0].message.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH + 20)
  })

  it("truncates the oversized message without dropping its neighbours", () => {
    const result = manageContextWindow([
      { type: "user", message: "first" },
      { type: "model", message: "y".repeat(MAX_MESSAGE_LENGTH * 2) },
      { type: "user", message: "last" },
    ])

    expect(result).toHaveLength(3)
    expect(result[0].message).toBe("first")
    expect(result[2].message).toBe("last")
  })

  it("returns an empty array for missing or malformed context", () => {
    expect(manageContextWindow([])).toEqual([])
    expect(manageContextWindow(undefined as never)).toEqual([])
    expect(manageContextWindow(null as never)).toEqual([])
  })
})
