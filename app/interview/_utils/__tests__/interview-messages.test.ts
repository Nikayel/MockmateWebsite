import { describe, expect, it } from "vitest"
import { getInitialInterviewerMessage, getResumedInterviewerMessage } from "../interview-messages"

describe("Sable seed messages", () => {
  it("opens debugging without a hypothesis questionnaire or spoiler", () => {
    const message = getInitialInterviewerMessage("Adjustment matcher", "easy", "BUG FIX")
    expect(message).toContain("**Adjustment matcher**")
    expect(message.split(/\s+/).length).toBeLessThan(40)
    expect(message).not.toMatch(
      /hypothesis|before editing|reconciled|lookup ordering|evidence behind/
    )
  })

  it("resumes in one short message without repeating the onboarding checklist", () => {
    const message = getResumedInterviewerMessage("Adjustment matcher")
    expect(message).toContain("where you left off")
    expect(message.split(/\s+/).length).toBeLessThan(30)
    expect(message).not.toMatch(/Feel free to|before coding|a easy|BUG FIX/)
  })
})
