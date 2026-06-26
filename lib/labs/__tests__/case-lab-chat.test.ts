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
    expect(prompt).toContain("why A over B")
  })

  it("adapts coaching per milestone", () => {
    const clarify = buildCaseLabChatSystemPrompt({ milestone: "clarify" })
    const build = buildCaseLabChatSystemPrompt({ milestone: "build" })
    expect(clarify).toContain("clarifying questions")
    expect(build).toContain("real codebase")
    expect(clarify).not.toEqual(build)
  })

  it("includes grounding context when provided", () => {
    const prompt = buildCaseLabChatSystemPrompt({
      milestone: "review",
      context: "Build: 5/5 tests passing",
    })
    expect(prompt).toContain("5/5 tests passing")
  })
})
