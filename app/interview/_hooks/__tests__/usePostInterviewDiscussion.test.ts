/** @vitest-environment jsdom */
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/firebase-lazy", () => ({ getCurrentUserToken: vi.fn(async () => "token-1") }))
vi.mock("@/lib/interview", () => ({
  analyzeComplexityWithLLM: vi.fn(async () => null),
  analyzeCodeEfficiency: vi.fn(() => ({
    linesOfCode: 1,
    complexity: "simple",
    estimatedTimeComplexity: "O(1)",
    estimatedSpaceComplexity: "O(1)",
    optimalTimeComplexity: "O(1)",
    optimalSpaceComplexity: "O(1)",
    efficiencyScore: 100,
  })),
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

import { usePostInterviewDiscussion } from "../usePostInterviewDiscussion"

const fetchMock = vi.fn()

function buildOptions() {
  let savedMessages: unknown[] = []
  return {
    options: {
      user: { id: "user-1", email: "user@example.com" },
      usageLimit: { used: 1 },
      experienceLevel: "mid",
      currentSessionId: "session-1",
      selectedScenario: {
        id: "scenario-1",
        title: "Two Sum",
        description: "Find two values",
        difficulty: "easy",
        type: "dsa",
      },
      code: "return [0, 1]",
      selectedLanguage: "javascript",
      elapsedTime: 60,
      interviewerMessages: [],
      consoleLogs: [],
      conversationTracker: {},
      recentNudgeTopics: [],
      targetCompany: null,
      chatWorkspaceContext: null,
      setIsGeneratingDiscussion: vi.fn(),
      setEfficiencyMetrics: vi.fn(),
      setInterviewerMessages: vi.fn((messages) => {
        savedMessages = messages
      }),
      getCachedUserProfile: vi.fn(async () => null),
      getEdgeCasesForInterviewer: vi.fn(() => []),
      updateTrackerOnMessage: vi.fn(),
      onDiscussionStarted: vi.fn(async () => {}),
    },
    getSavedMessages: () => savedMessages,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

describe("usePostInterviewDiscussion", () => {
  it("sends the stable scenario ID and edited solution during a workspace debrief", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: "Compare the fixes?" }),
    })
    const { options } = buildOptions()
    const solution =
      "def merge_threads(existing_threads, incoming_threads): return existing_threads"
    const { result } = renderHook(() =>
      usePostInterviewDiscussion({
        ...options,
        selectedScenario: {
          id: "bugfix-comment-thread-merge",
          type: "bugfix",
          title: "Editor Comments",
          executionMode: "workspace",
          workspace: { primaryFilePath: "src/comment_threads.py" },
        },
        code: "# README is currently open",
        chatWorkspaceContext: [
          { path: "src/comment_threads.py", role: "editable", content: solution },
        ],
      } as never)
    )
    await result.current.triggerPostInterviewDiscussion([], {
      passed: 7,
      total: 7,
      failed: 0,
      passRate: 100,
    })
    const request = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(request).toMatchObject({
      scenarioId: "bugfix-comment-thread-merge",
      currentCode: solution,
      hasSubmitted: true,
    })
    const { analyzeComplexityWithLLM } = await import("@/lib/interview")
    expect(analyzeComplexityWithLLM).toHaveBeenCalledWith(
      expect.objectContaining({ code: solution })
    )
  })

  it("tags a successful kickoff so resume logic can recognize it", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: "Nice work. What is the time complexity?" }),
    })
    const { options, getSavedMessages } = buildOptions()
    const { result } = renderHook(() => usePostInterviewDiscussion(options as never))
    const { triggerPostInterviewDiscussion } = result.current

    const started = await triggerPostInterviewDiscussion([], {
      passed: 1,
      total: 1,
      failed: 0,
      passRate: 100,
    })

    expect(started).toBe(true)
    expect(getSavedMessages()).toEqual([
      expect.objectContaining({
        type: "ai",
        message: "Nice work. What is the time complexity?",
        phase: "post_interview",
      }),
    ])
    expect(options.onDiscussionStarted).toHaveBeenCalledWith(
      expect.objectContaining({
        interviewerMessages: getSavedMessages(),
        testSummary: { passed: 1, total: 1, failed: 0, passRate: 100 },
      })
    )
  })

  it("reports that kickoff did not start when the API returns no reply", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    const { options } = buildOptions()
    const { result } = renderHook(() => usePostInterviewDiscussion(options as never))
    const { triggerPostInterviewDiscussion } = result.current

    await expect(
      triggerPostInterviewDiscussion([], { passed: 0, total: 1, failed: 1, passRate: 0 })
    ).resolves.toBe(false)
  })
})
