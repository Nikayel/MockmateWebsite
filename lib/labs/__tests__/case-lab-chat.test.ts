/**
 * Tests for the pure Case Lab chat system-prompt builder.
 */

import { describe, it, expect } from "vitest"
import { buildCaseLabChatSystemPrompt } from "../case-lab-chat"

describe("buildCaseLabChatSystemPrompt", () => {
  it("includes the company persona and milestone coaching", () => {
    const prompt = buildCaseLabChatSystemPrompt({
      milestone: "design",
      lab: { title: "911 Dispatch", company: "palantir", role: "FDSE" },
    })
    expect(prompt).toContain("palantir")
    expect(prompt).toContain("911 Dispatch")
    expect(prompt).toContain("DESIGN")
    expect(prompt).toContain("committing to a contract")
  })

  it("adapts coaching per milestone", () => {
    const clarify = buildCaseLabChatSystemPrompt({ milestone: "clarify" })
    const build = buildCaseLabChatSystemPrompt({ milestone: "build" })
    expect(clarify).toContain("clarifying questions")
    expect(build).toContain("real codebase")
    expect(clarify).not.toEqual(build)
  })

  it("keeps the fallback coaching free of any single lab's domain nouns", () => {
    // The old fallback hardcoded 911 dispatch ("unit mid-task"), which misfired
    // on other labs like the Stripe billing lab.
    for (const milestone of ["clarify", "decompose", "design", "build", "review"] as const) {
      const prompt = buildCaseLabChatSystemPrompt({ milestone })
      expect(prompt).not.toMatch(/unit mid-task|responder|dispatch/i)
    }
  })

  it("layers the round guidance on top when provided", () => {
    const prompt = buildCaseLabChatSystemPrompt({
      milestone: "clarify",
      roundGuidance: {
        whatItTests: "whether you scope an open problem before solving it",
        commonTrap: "jumping straight to a ranking formula",
      },
    })
    expect(prompt).toContain("whether you scope an open problem before solving it")
    expect(prompt).toContain("jumping straight to a ranking formula")
  })

  it("includes grounding context when provided", () => {
    const prompt = buildCaseLabChatSystemPrompt({
      milestone: "review",
      context: "Build: 5/5 tests passing",
    })
    expect(prompt).toContain("5/5 tests passing")
  })
})
