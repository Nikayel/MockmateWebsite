// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useInterviewChat, type UseInterviewChatOptions } from "../useInterviewChat"
import { INTERVIEW_COMPLETION_REPLY } from "@/lib/interview/completion/contract"
import { createValidatedChatStream } from "@/lib/interview/chat/validated-response-stream"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }))
vi.mock("@/lib/metrics/funnel-client", () => ({ reportFunnelEvent: vi.fn() }))
vi.mock("sonner", () => ({ toast: { dismiss: vi.fn(), info: vi.fn(), error: vi.fn() } }))

function options(): UseInterviewChatOptions {
  return {
    chatInput: "",
    interviewerInput: "How do I close this interview?",
    chatMessages: [],
    interviewerMessages: [{ type: "ai", message: "Any questions for me?" }],
    interviewerVoice: {
      isRecording: false,
      stopRecording: vi.fn(),
      resetTranscript: vi.fn(),
      clearSentTracker: vi.fn(),
    },
    selectedScenario: null,
    code: "",
    chatWorkspaceContext: [],
    recentNudgeTopics: [],
    userAnsweredTopics: [],
    testResults: [],
    consoleLogs: [],
    currentSessionId: null,
    firebaseUser: { getIdToken: async () => "test-token" },
    user: null,
    usageLimit: null,
    experienceLevel: "beginner",
    showPostInterviewDiscussion: true,
    targetCompany: null,
    interviewStartTime: null,
    setChatInput: vi.fn(),
    setInterviewerInput: vi.fn(),
    setChatMessages: vi.fn(),
    setInterviewerMessages: vi.fn(),
    setIsLoadingChat: vi.fn(),
    setIsLoadingInterviewer: vi.fn(),
    setRecentNudgeTopics: vi.fn(),
    updateTrackerOnMessage: vi.fn(),
    getInterviewerChatParams: () => ({ hasSubmitted: true }),
    getEdgeCasesForInterviewer: () => [],
    getCachedUserProfile: async () => null,
    recordBugfixEvidence: vi.fn(),
    classifyBugfixAIHelpKind: () => "other",
    proceedToFinalFeedback: vi.fn(),
  }
}

const completionResponse = {
  reply: INTERVIEW_COMPLETION_REPLY,
  provider: "openai-none",
  action: { type: "end_interview" as const },
}

beforeEach(() => vi.stubGlobal("fetch", vi.fn()))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("chat completion opens scoring", () => {
  it.each(["json", "validated-stream"])(
    "runs the existing feedback action once after %s",
    async (mode) => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mode === "validated-stream"
          ? createValidatedChatStream(completionResponse, { chunkDelayMs: 0 })
          : new Response(JSON.stringify(completionResponse))
      )
      const opts = options()
      const { result } = renderHook(() => useInterviewChat(opts))
      await act(async () => result.current.handleSendMessage(true))
      expect(opts.proceedToFinalFeedback).toHaveBeenCalledOnce()
      expect(opts.proceedToFinalFeedback).toHaveBeenCalledWith([
        ...opts.interviewerMessages,
        expect.objectContaining({ type: "user", message: "How do I close this interview?" }),
        expect.objectContaining({ type: "ai", message: INTERVIEW_COMPLETION_REPLY }),
      ])
    }
  )

  it.each([
    "two events same user 1801 seconds apart -> count 2",
    "No nothing to add",
    "I don't understand the question",
    "Don't end the interview",
  ])(
    "keeps the interview open after %j even with a completion action",
    async (interviewerInput) => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(completionResponse)))
      const opts = { ...options(), interviewerInput }
      const { result } = renderHook(() => useInterviewChat(opts))
      await act(async () => result.current.handleSendMessage(true))
      expect(opts.proceedToFinalFeedback).not.toHaveBeenCalled()
    }
  )

  it.each([
    { isInterviewer: false, postInterview: true, action: { type: "end_interview" } },
    { isInterviewer: true, postInterview: false, action: { type: "end_interview" } },
    { isInterviewer: true, postInterview: true, action: { type: "end_interview", score: 100 } },
    { isInterviewer: true, postInterview: true, action: undefined },
  ])(
    "does not end on an ineligible or unvalidated response: %j",
    async ({ isInterviewer, postInterview, action }) => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ ...completionResponse, action }))
      )
      const opts = {
        ...options(),
        chatInput: "Show my score",
        showPostInterviewDiscussion: postInterview,
      }
      const { result } = renderHook(() => useInterviewChat(opts))
      await act(async () => result.current.handleSendMessage(isInterviewer))
      expect(opts.proceedToFinalFeedback).not.toHaveBeenCalled()
    }
  )

  it("ignores completion from a paused or replaced session", async () => {
    let resolve!: (response: Response) => void
    vi.mocked(fetch).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      })
    )
    const opts = { ...options(), generationRef: { current: 1 } }
    const { result } = renderHook(() => useInterviewChat(opts))
    let pending!: Promise<void>
    await act(async () => {
      pending = result.current.handleSendMessage(true)
    })
    opts.generationRef.current++
    await act(async () => {
      resolve(new Response(JSON.stringify(completionResponse)))
      await pending
    })
    expect(opts.proceedToFinalFeedback).not.toHaveBeenCalled()
  })
})
