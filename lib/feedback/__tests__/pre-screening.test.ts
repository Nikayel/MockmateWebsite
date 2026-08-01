import { describe, it, expect } from "vitest"
import { preScreenConversation } from "../pre-screening"

/**
 * These pin CURRENT behaviour, including a known weakness: the keywordStuffing
 * detector requires fewer than 30 words across the ENTIRE candidate transcript,
 * so it cannot fire on a stuffed session of any realistic length. The scoring
 * caps that consume this flag are therefore mostly inert in production. The
 * inertness is pinned deliberately (see the last describe block) so that a
 * future recalibration has to confront it rather than silently change who
 * gets flagged.
 */
function turns(...contents: string[]) {
  return contents.map((content) => ({ role: "candidate", content }))
}

describe("preScreenConversation", () => {
  it("returns the empty result for a missing or empty transcript", () => {
    for (const input of [undefined, []]) {
      const result = preScreenConversation(input as never)
      expect(result.hasContent).toBe(false)
      expect(result.candidateMessageCount).toBe(0)
      expect(result.avgMessageLength).toBe(0)
      expect(result.suspiciousPatterns.tooShort).toBe(true)
      expect(result.suspiciousPatterns.keywordStuffing).toBe(false)
    }
  })

  it("counts only candidate and user turns, ignoring the interviewer", () => {
    const result = preScreenConversation([
      { role: "interviewer", content: "Walk me through your approach please." },
      { role: "candidate", content: "I will use a hash map to store seen values." },
      { role: "user", content: "That gives linear time overall." },
      { role: "interviewer", content: "Good." },
    ])
    expect(result.candidateMessageCount).toBe(2)
  })

  it("computes average message length over candidate turns only", () => {
    const result = preScreenConversation(turns("a".repeat(40), "b".repeat(60)))
    expect(result.avgMessageLength).toBe(50)
  })

  it("hasContent requires at least one turn and more than 10 characters", () => {
    expect(preScreenConversation(turns("short")).hasContent).toBe(false)
    expect(preScreenConversation(turns("this is long enough")).hasContent).toBe(true)
  })
})

describe("preScreenConversation keyword families", () => {
  it("detects complexity talk", () => {
    const result = preScreenConversation(turns("This runs in O(n) time and constant space."))
    expect(result.hasKeywords.complexity).toBe(true)
  })

  it("detects approach talk", () => {
    const result = preScreenConversation(turns("My plan is to iterate once with a hash map."))
    expect(result.hasKeywords.approach).toBe(true)
  })

  it("detects alternatives talk", () => {
    const result = preScreenConversation(
      turns("The brute force would be quadratic, so there is a trade-off here.")
    )
    expect(result.hasKeywords.alternatives).toBe(true)
  })

  it("detects edge-case talk", () => {
    const result = preScreenConversation(turns("What if the array is empty or has duplicates?"))
    expect(result.hasKeywords.edgeCases).toBe(true)
  })
})

describe("preScreenConversation suspicious patterns", () => {
  it("flags tooShort below a 20 character average", () => {
    expect(preScreenConversation(turns("yes", "ok sure")).suspiciousPatterns.tooShort).toBe(true)
    expect(
      preScreenConversation(turns("I will iterate over the array once.")).suspiciousPatterns
        .tooShort
    ).toBe(false)
  })

  it("flags gibberish only above 20 words with a low unique ratio", () => {
    const repetitive = preScreenConversation(turns("spam ".repeat(40).trim()))
    expect(repetitive.suspiciousPatterns.possibleGibberish).toBe(true)

    const varied = preScreenConversation(
      turns(
        "I would begin by clarifying the constraints and then sketch a solution before writing any real implementation code today."
      )
    )
    expect(varied.suspiciousPatterns.possibleGibberish).toBe(false)
  })

  it("does not flag a normal substantive session as stuffed", () => {
    const result = preScreenConversation(
      turns(
        "My approach is to iterate the array once and keep a hash map of values I have already seen.",
        "That gives O(n) time and O(n) space, which beats the quadratic brute force.",
        "I should also handle the empty array and duplicate values as edge cases."
      )
    )
    expect(result.suspiciousPatterns.keywordStuffing).toBe(false)
  })
})

describe("KNOWN WEAKNESS: keywordStuffing is unreachable on realistic transcripts", () => {
  it("does not fire on a long stuffed transcript because of the wordCount < 30 conjunct", () => {
    // Keyword salad with no substance across all four families, but the
    // transcript exceeds 30 words in total.
    const stuffed = preScreenConversation(
      turns(
        "O(n) time complexity big o linear constant",
        "approach algorithm strategy hash map array iterate loop",
        "brute force trade-off alternative another way optimize",
        "edge case empty null duplicate boundary overflow zero"
      )
    )
    expect(Object.values(stuffed.hasKeywords).filter(Boolean)).toHaveLength(4)
    // The flag the scoring caps depend on stays false. This is the gap:
    // recalibrating the detector is what would make those caps bite.
    expect(stuffed.suspiciousPatterns.keywordStuffing).toBe(false)
  })

  it("only fires on a transcript so short it is close to silent anyway", () => {
    const contents = ["O(n) hash map", "empty edge case", "brute force"]
    const result = preScreenConversation(turns(...contents))
    expect(contents.join(" ").split(/\s+/).length).toBeLessThan(30)
    expect(result.suspiciousPatterns.keywordStuffing).toBe(true)
  })
})
