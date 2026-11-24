// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useInterviewChat, type UseInterviewChatOptions } from "../useInterviewChat"
import {
  GUEST_CHAT_LIMIT_CODE,
  GUEST_CHAT_TURN_LIMIT,
  GUEST_TURNS_REMAINING_HEADER,
} from "@/lib/interview/guest-chat-limit"
import { trackEvent } from "@/lib/analytics"
import { reportFunnelEvent } from "@/lib/metrics/funnel-client"
import { toast } from "sonner"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }))
vi.mock("@/lib/metrics/funnel-client", () => ({ reportFunnelEvent: vi.fn() }))
vi.mock("sonner", () => ({ toast: { dismiss: vi.fn(), info: vi.fn(), error: vi.fn() } }))

const GUEST_ID = "guest-12345678-1234-1234-1234-123456789abc"

function guestOptions(overrides: Partial<UseInterviewChatOptions> = {}): UseInterviewChatOptions {
  return {
    chatInput: "",
    interviewerInput: "I think there is a race condition in the cache.",
    chatMessages: [],
    interviewerMessages: [],
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
    currentSessionId: "guest-sess-1",
    firebaseUser: null,
    guestId: GUEST_ID,
    onGuestTurnsRemainingChange: vi.fn(),
    user: null,
    usageLimit: null,
    experienceLevel: "beginner",
    showPostInterviewDiscussion: false,
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
    getInterviewerChatParams: () => ({}),
    getEdgeCasesForInterviewer: () => [],
    getCachedUserProfile: async () => null,
    recordBugfixEvidence: vi.fn(),
    classifyBugfixAIHelpKind: () => "other",
    proceedToFinalFeedback: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("fetch", vi.fn())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("useInterviewChat guest trial turns", () => {
  it("sends guest turns with X-Guest-Id and reports server-remaining replies", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          reply: "Walk me through why you suspect a race.",
          provider: "openai-none",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            [GUEST_TURNS_REMAINING_HEADER]: "2",
          },
        }
      )
    )

    const opts = guestOptions()
    const { result } = renderHook(() => useInterviewChat(opts))
    await act(async () => result.current.handleSendMessage(true))

    expect(fetch).toHaveBeenCalledOnce()
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init?.headers as Record<string, string>)["X-Guest-Id"]).toBe(GUEST_ID)
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(opts.onGuestTurnsRemainingChange).toHaveBeenCalledWith(2)
    expect(trackEvent).not.toHaveBeenCalledWith("guest_chat_walled", expect.anything())
  })

  it("shows the signup wall instead of an error toast when the server returns GUEST_CHAT_LIMIT_REACHED and skips further network calls", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "Free trial interviewer limit reached.",
          code: GUEST_CHAT_LIMIT_CODE,
          turnsUsed: GUEST_CHAT_TURN_LIMIT,
          turnsLimit: GUEST_CHAT_TURN_LIMIT,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    )

    const opts = guestOptions()
    const { result } = renderHook(() => useInterviewChat(opts))
    await act(async () => result.current.handleSendMessage(true))

    expect(toast.error).not.toHaveBeenCalled()
    expect(opts.onGuestTurnsRemainingChange).toHaveBeenCalledWith(0)
    expect(trackEvent).toHaveBeenCalledWith("guest_chat_walled", {
      scenario_id: undefined,
      exhausted: true,
    })
    expect(reportFunnelEvent).toHaveBeenCalledWith("guest_chat_walled")

    // Next attempt short-circuits locally without another network round-trip
    await act(async () => result.current.handleSendMessage(true, "One more question"))
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("falls back to the inline signup wall immediately when no guest session exists", async () => {
    const opts = guestOptions({ currentSessionId: null, guestId: null })
    const { result } = renderHook(() => useInterviewChat(opts))
    await act(async () => result.current.handleSendMessage(true))

    expect(fetch).not.toHaveBeenCalled()
    expect(reportFunnelEvent).toHaveBeenCalledWith("guest_chat_walled")
  })
})
