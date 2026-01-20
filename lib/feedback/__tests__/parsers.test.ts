/**
 * Tests for feedback parsers
 */

import { parseFeedback, parseFeedbackSections } from "../parsers"

describe("Feedback Parsers", () => {
  describe("parseFeedbackSections", () => {
    it("should parse bullets with bold labels (e.g., **Label**: content)", () => {
      const feedback = `**TL;DR** – You solved the problem correctly.

**What Worked**
- **Solid sliding window implementation**: Your code passed all 4 tests and correctly uses a dictionary
- **Explained your approach before coding**: You articulated the left/right pointer strategy upfront
- **Proactive edge case discussion**: You mentioned duplicates early

**Fix Next**
- **CRITICAL: Correct your complexity understanding**: You stated O(1) time complexity when it's O(n)
- **Expand edge case coverage**: Also consider null inputs

**Action Plan**
1. Review sliding window pattern
2. Practice verbalizing complexity`

      const sections = parseFeedbackSections(feedback)

      expect(sections.whatWorked).toHaveLength(3)
      expect(sections.whatWorked?.[0]).toContain("Solid sliding window")
      expect(sections.whatWorked?.[1]).toContain("Explained your approach")
      expect(sections.whatWorked?.[2]).toContain("Proactive edge case")

      expect(sections.fixNext).toHaveLength(2)
      expect(sections.fixNext?.[0]).toContain("CRITICAL")
      expect(sections.fixNext?.[1]).toContain("edge case coverage")

      expect(sections.actionPlan).toHaveLength(2)
    })

    it("should filter out pure section headers but keep formatted content", () => {
      const feedback = `**TL;DR** – Summary here.

**What Worked**
- **Good approach**: Explained well
- What Worked
- **Another strength**: More details

**Fix Next**
- Improve X`

      const sections = parseFeedbackSections(feedback)

      // Should have 2 items - the bold-labeled ones
      // "What Worked" plain text should be filtered as it's a header
      expect(sections.whatWorked?.length).toBeGreaterThanOrEqual(2)
      expect(sections.whatWorked?.some((item) => item === "What Worked")).toBe(false)
    })

    it("should parse bullets without bold labels", () => {
      const feedback = `**TL;DR** – Summary.

**What Worked**
- Good algorithm choice
- Clean code structure

**Fix Next**
- Add error handling`

      const sections = parseFeedbackSections(feedback)

      expect(sections.whatWorked).toHaveLength(2)
      expect(sections.whatWorked?.[0]).toBe("Good algorithm choice")
      expect(sections.whatWorked?.[1]).toBe("Clean code structure")
    })
  })

  describe("parseFeedback", () => {
    it("should parse scores from Score Snapshot section", () => {
      const feedback = `**TL;DR** – Good performance overall.

**Score Snapshot**
- Understanding: 80/100 – Strong grasp
- Problem-Solving: 85/100 – Good logic
- Code Quality: 87/100 – Clean code
- Communication: 78/100 – Could explain more
- Overall: 83/100

**What Worked**
- Correct solution`

      const sections = parseFeedback(feedback)

      expect(sections.scores.understanding).toBe(80)
      expect(sections.scores.problemSolving).toBe(85)
      expect(sections.scores.codeQuality).toBe(87)
      expect(sections.scores.communication).toBe(78)
    })
  })
})
