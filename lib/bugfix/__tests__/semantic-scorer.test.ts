import { describe, expect, it } from "vitest"
import { fitTranscript, BUGFIX_TRANSCRIPT_BUDGET } from "@/lib/bugfix/semantic-scorer"

describe("fitTranscript", () => {
  it("passes a short transcript through untouched", () => {
    const transcript = "USER: I think the dedup key is per-stream.\n\nASSISTANT: Say more."
    expect(fitTranscript(transcript)).toBe(transcript)
  })

  it("keeps both ends of an over-long transcript", () => {
    // The hypothesis is stated at the start of a session and the root cause at the
    // debrief. Truncating either end drops a scored dimension's only evidence, so a
    // candidate who did state it would score 0 for it.
    const hypothesis = "USER: my hypothesis is the per-stream dedup double counts."
    const rootCause = "USER: root cause: the dedup set is rebuilt per stream."
    const filler = "\n\nASSISTANT: keep going.".repeat(1000)
    const transcript = `${hypothesis}${filler}${rootCause}`

    expect(transcript.length).toBeGreaterThan(BUGFIX_TRANSCRIPT_BUDGET)

    const fitted = fitTranscript(transcript)
    expect(fitted).toContain("my hypothesis is the per-stream dedup double counts")
    expect(fitted).toContain("root cause: the dedup set is rebuilt per stream")
    expect(fitted).toContain("omitted for length")
  })

  it("respects the budget", () => {
    const fitted = fitTranscript("x".repeat(50_000))
    expect(fitted.length).toBeLessThanOrEqual(BUGFIX_TRANSCRIPT_BUDGET)
  })

  it("favors the tail, where two of the three dimensions are stated", () => {
    const transcript = `${"H".repeat(20_000)}${"T".repeat(20_000)}`
    const fitted = fitTranscript(transcript)

    const heads = (fitted.match(/H/g) ?? []).length
    const tails = (fitted.match(/T/g) ?? []).length
    expect(tails).toBeGreaterThan(heads)
  })

  it("degrades to a plain truncation rather than throwing on a tiny budget", () => {
    expect(() => fitTranscript("hello world", 4)).not.toThrow()
    expect(fitTranscript("hello world", 4)).toBe("hell")
  })
})
