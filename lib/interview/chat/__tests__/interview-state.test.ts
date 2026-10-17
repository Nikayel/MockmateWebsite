import { describe, expect, it, vi } from "vitest"
import { buildSessionContext } from "@/lib/interview/session-context/snapshot"
import { buildChatRequestContext } from "../request-context"
import { resolveChatInterviewState } from "../interview-state"

vi.mock("@/lib/feature-flags", () => ({ getFlag: () => false }))

describe("chat interview state", () => {
  it.each([
    { modified: false, current: true, submitted: false, phase: "discussion" },
    { modified: true, current: true, submitted: false, phase: "testing" },
    { modified: true, current: false, submitted: false, phase: "coding" },
    { modified: true, current: false, submitted: true, phase: "post_interview" },
  ])(
    "resolves debugging state: $modified/$current/$submitted -> $phase",
    ({ modified, current, submitted, phase }) => {
      const sessionContext = buildSessionContext({
        task: { id: "debug", title: "Debug", type: "bugfix", description: "Public task" },
        workspace: [
          {
            path: "main.py",
            role: "editable",
            content: modified ? "after!" : "before",
            originalContent: "before",
          },
        ],
        code: modified ? "after!" : "before",
        interviewerMessages: [],
        partnerMessages: [],
      })
      sessionContext.testsMatchCurrentRevision = current
      const state = resolveChatInterviewState(
        buildChatRequestContext({
          scenarioType: "bugfix",
          sessionContext,
          hasSubmitted: submitted,
          currentCode: "after!",
          starterCodeLength: 6,
          testResults: [{ passed: true }],
        })
      )
      expect(state.currentPhase).toBe(phase)
      expect(state.testsHaveRunNow).toBe(current)
      expect(state.testResultsArray).toHaveLength(current ? 1 : 0)
    }
  )

  it("retains legacy DSA phase detection and its test evidence", () => {
    const state = resolveChatInterviewState(
      buildChatRequestContext({
        scenarioType: "dsa",
        currentCode: "return 1",
        testResults: [{ passed: true }],
      })
    )
    expect(state.currentPhase).toBe("testing")
    expect(state.testResultsArray).toEqual([{ passed: true }])
  })
})
