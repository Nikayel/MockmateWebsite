import { describe, expect, it, vi } from "vitest"
import { createEmptyTracker } from "@/lib/interview/interview-phases"
import { buildSessionContext } from "@/lib/interview/session-context/snapshot"
import { buildChatRequestContext } from "../request-context"
import { prepareConversationExtraction } from "../extraction-job"

vi.mock("@/lib/feature-flags", () => ({ getFlag: () => false }))
vi.mock("@/lib/interview/conversation-extraction", () => ({ shouldRunExtraction: () => false }))

describe("conversation extraction preparation", () => {
  const request = () =>
    buildChatRequestContext({
      role: "interviewer",
      message: "My theory is a boundary error",
      context: Array.from({ length: 40 }, (_, i) => ({
        type: i % 2 ? "ai" : "user",
        message: `turn ${i}`,
      })),
      conversationTracker: createEmptyTracker(),
      userId: "untrusted-body-user",
    })

  it("preserves the full history and bills the verified user", () => {
    const job = prepareConversationExtraction(request(), "verified-user")
    expect(job?.recentMessages).toHaveLength(40)
    expect(job?.recentMessages[0]).toEqual({ role: "candidate", content: "turn 0" })
    expect(job?.recentMessages[1].role).toBe("interviewer")
    expect(job?.userId).toBe("verified-user")
  })

  it("does not prepare extraction for the partner lane", () => {
    expect(
      prepareConversationExtraction({ ...request(), role: "partner" }, "verified-user")
    ).toBeNull()
  })

  it("keeps rich debugging sessions on their existing no-extraction path", () => {
    const sessionContext = buildSessionContext({
      task: { id: "debug", title: "Debug", type: "bugfix", description: "Public task" },
      code: "",
      workspace: [],
      interviewerMessages: [],
      partnerMessages: [],
    })
    expect(
      prepareConversationExtraction(
        { ...request(), scenarioType: "bugfix", sessionContext },
        "verified-user"
      )
    ).toBeNull()
  })
})
