import { describe, expect, it } from "vitest"
import { buildInterviewerPrompt } from "../interviewer-prompts"
import { buildBugFixContext, buildSystemDesignPromptContext } from "../chat/context-builders"
import { bugfixOnboardingScenario } from "@/lib/scenarios/real-world/bugfix/bugfix-onboarding"

describe("candidate-led non-DSA prompts", () => {
  it.each(["bugfix", "system-design"])(
    "does not borrow DSA interrogation for %s",
    (scenarioType) => {
      const prompt = buildInterviewerPrompt({
        scenarioType,
        phase: "discussion",
        problemTitle: "Practice",
        problemDifficulty: "easy",
      })
      expect(prompt).toContain("A brief acknowledgment is a complete response")
      expect(prompt).toContain("at most two unless")
      expect(prompt).not.toContain("Use check_prerequisites tool")
      expect(prompt).not.toContain("CORRECT statement → Acknowledge neutrally, then probe deeper")
      expect(prompt).not.toContain("have them trace a concrete input")
      expect(prompt).not.toContain("This is O(n²)")
      expect(prompt).not.toContain("checking a value before validating")
    }
  )

  it("treats debugging stages as observations, not approval gates", () => {
    const { bugFixContext } = buildBugFixContext("bugfix")
    expect(bugFixContext).toContain("not a script or required sequence")
    expect(bugFixContext).not.toContain("Ask for the hypothesis before accepting a fix")
    expect(bugFixContext).not.toContain("Ask why the patch is minimal")
    expect(bugFixContext).toContain("not permission to diagnose it for them")
    expect(bugfixOnboardingScenario.problemStatement).not.toContain("Write a hypothesis")
    expect(bugfixOnboardingScenario.problemStatement).toContain("in the conversation")
  })

  it("does not restart system-design requirements solely because of the clock", () => {
    const prompt = buildSystemDesignPromptContext("system-design", 60).systemDesignContext
    expect(prompt).toContain("pacing suggestions, not gates")
    expect(prompt).not.toContain("DON'T jump into architecture yet")
  })

  it("gives a submitted debugging session the correct feedback action, not a new checklist", () => {
    const prompt = buildInterviewerPrompt(
      {
        scenarioType: "bugfix",
        phase: "post_interview",
        problemTitle: "Practice",
        problemDifficulty: "easy",
      },
      "turn"
    )
    expect(prompt).toContain("View feedback")
    expect(prompt).not.toContain("What's the time complexity")
    expect(prompt).not.toContain("See Full Interview Score")
  })
})
