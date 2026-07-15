import { describe, expect, it } from "vitest"
import { describeStdoutDiff, diffStdout } from "../stdout-oracle"

describe("diffStdout", () => {
  it("matches identical output byte-for-byte", () => {
    const out = "account totals\nacme: 42\nglobex: 17\n"
    const result = diffStdout(out, out)
    expect(result.match).toBe(true)
    expect(result.firstDiffLine).toBeNull()
    expect(result.section).toBeNull()
  })

  it("treats a missing trailing newline as a mismatch", () => {
    const expected = "acme: 42\n"
    const result = diffStdout("acme: 42", expected)
    expect(result.match).toBe(false)
    // trailing newline means expected has an extra empty final line
    expect(result.firstDiffLine).toBe(1)
  })

  it("reports the first differing line and its value", () => {
    const expected = "acme: 42\nglobex: 17\n"
    const actual = "acme: 42\nglobex: 18\n"
    const result = diffStdout(actual, expected)
    expect(result.match).toBe(false)
    expect(result.firstDiffLine).toBe(1)
    expect(result.expectedLine).toBe("globex: 17")
    expect(result.actualLine).toBe("globex: 18")
  })

  it("labels the diff with the nearest === header === section", () => {
    const expected = "=== Alerts ===\nhost-1: OK\n=== Totals ===\nacme: 42\nglobex: 17\n"
    const actual = "=== Alerts ===\nhost-1: OK\n=== Totals ===\nacme: 42\nglobex: 99\n"
    const result = diffStdout(actual, expected)
    expect(result.firstDiffLine).toBe(4)
    expect(result.section).toBe("=== Totals ===")
  })

  it("labels the diff with the nearest colon-label header", () => {
    const expected = "Totals:\nacme 42\n"
    const actual = "Totals:\nacme 43\n"
    const result = diffStdout(actual, expected)
    expect(result.section).toBe("Totals:")
  })

  it("falls back to 'output' when there is no header before the diff", () => {
    const result = diffStdout("1\n2\n", "1\n3\n")
    expect(result.section).toBe("output")
  })

  it("handles actual output longer than expected", () => {
    const result = diffStdout("a\nb\nc\n", "a\nb\n")
    expect(result.match).toBe(false)
    expect(result.expectedLine).toBe("")
    expect(result.actualLine).toBe("c")
  })
})

describe("describeStdoutDiff", () => {
  it("stays non-revealing and names the section + 1-indexed line", () => {
    const expected = "=== Totals ===\nacme: 42\n"
    const actual = "=== Totals ===\nacme: 43\n"
    const message = describeStdoutDiff(diffStdout(actual, expected))
    expect(message).toContain("line 2")
    expect(message).toContain("Totals")
    expect(message.toLowerCase()).not.toContain("bug")
  })

  it("confirms a clean match", () => {
    expect(describeStdoutDiff(diffStdout("x\n", "x\n"))).toContain("matches the oracle")
  })
})
