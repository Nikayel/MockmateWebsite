import { describe, expect, it } from "vitest"
import { repairInterviewTranscript } from "./transcript-repair"

describe("repairInterviewTranscript", () => {
  describe("Big-O complexity", () => {
    it.each([
      ["this runs in o of n", "this runs in O(n)"],
      ["that's o of n log n", "that's O(n log n)"],
      ["binary search is o of log n", "binary search is O(log n)"],
      ["the nested loop makes it o of n squared", "the nested loop makes it O(n^2)"],
      ["worst case o of n factorial", "worst case O(n!)"],
      ["subsets are o of two to the n", "subsets are O(2^n)"],
      ["lookup is o of one", "lookup is O(1)"],
      ["traversal is o of v plus e", "traversal is O(V + E)"],
    ])("repairs %j", (spoken, expected) => {
      expect(repairInterviewTranscript(spoken)).toBe(expected)
    })

    it("handles the 'big' prefix", () => {
      expect(repairInterviewTranscript("big o of n log n")).toBe("O(n log n)")
    })

    it("handles Deepgram spelling the letter as 'oh'", () => {
      expect(repairInterviewTranscript("that's oh of n squared")).toBe("that's O(n^2)")
      expect(repairInterviewTranscript("big oh of log n")).toBe("O(log n)")
    })

    it("is case insensitive", () => {
      expect(repairInterviewTranscript("It is O Of N")).toBe("It is O(n)")
    })

    it("prefers the longest complexity body", () => {
      // "n log n" must not degrade to O(n) with a stranded "log n".
      expect(repairInterviewTranscript("o of n log n")).toBe("O(n log n)")
      expect(repairInterviewTranscript("o of log log n")).toBe("O(log log n)")
    })

    it("repairs more than one mention in a sentence", () => {
      expect(repairInterviewTranscript("o of n time and o of one space")).toBe(
        "O(n) time and O(1) space"
      )
    })
  })

  describe("does not overreach", () => {
    it.each([
      "the ratio of n to m is fixed",
      "turn it on and off",
      "I know of no better approach",
      "we talked on the phone",
      "the cost of one lookup",
    ])("leaves %j untouched", (sentence) => {
      expect(repairInterviewTranscript(sentence)).toBe(sentence)
    })

    it("leaves an unknown complexity body alone rather than guessing", () => {
      expect(repairInterviewTranscript("it's o of alpha")).toBe("it's o of alpha")
    })
  })

  describe("phrase repairs", () => {
    it("repairs 'four loop'", () => {
      expect(repairInterviewTranscript("write a four loop over the array")).toBe(
        "write a for loop over the array"
      )
    })

    it("repairs a standalone 'big oh'", () => {
      expect(repairInterviewTranscript("what's the big oh here")).toBe("what's the big O here")
    })

    it("leaves the number four alone elsewhere", () => {
      expect(repairInterviewTranscript("there are four elements")).toBe("there are four elements")
    })
  })

  describe("idempotence", () => {
    // Interim and final transcripts both pass through this function, so a rule
    // that fires on its own output would corrupt text as the user keeps talking.
    it.each([
      "this runs in o of n log n",
      "big oh of one",
      "write a four loop",
      "o of n time and o of one space",
    ])("repairing %j twice matches repairing it once", (spoken) => {
      const once = repairInterviewTranscript(spoken)

      expect(repairInterviewTranscript(once)).toBe(once)
    })
  })

  describe("edge cases", () => {
    it("passes empty input straight through", () => {
      expect(repairInterviewTranscript("")).toBe("")
    })

    it("leaves text with nothing to repair unchanged", () => {
      expect(repairInterviewTranscript("I would use a hash map")).toBe("I would use a hash map")
    })
  })
})
