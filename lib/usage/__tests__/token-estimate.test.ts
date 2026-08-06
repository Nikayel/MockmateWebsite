import { describe, it, expect } from "vitest"
import { estimateTokensFromText, ESTIMATED_CHARS_PER_TOKEN } from "../token-estimate"

describe("estimateTokensFromText", () => {
  it("uses the same four-characters-per-token ratio the Node fallback uses", () => {
    expect(ESTIMATED_CHARS_PER_TOKEN).toBe(4)
    expect(estimateTokensFromText("a".repeat(400))).toBe(100)
  })

  it("rounds up, so a short string never estimates as free", () => {
    expect(estimateTokensFromText("ab")).toBe(1)
    expect(estimateTokensFromText("abcde")).toBe(2)
  })

  it("returns 0 for absent or empty input", () => {
    expect(estimateTokensFromText("")).toBe(0)
    expect(estimateTokensFromText(undefined)).toBe(0)
    expect(estimateTokensFromText(null)).toBe(0)
  })

  it("returns 0 rather than NaN for a non-string", () => {
    // A NaN here would flow into the cost calculation and poison the ledger.
    expect(estimateTokensFromText(42 as unknown as string)).toBe(0)
  })
})
