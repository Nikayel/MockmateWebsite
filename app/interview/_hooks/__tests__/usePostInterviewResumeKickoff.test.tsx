/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { usePostInterviewResumeKickoff } from "../usePostInterviewResumeKickoff"

function buildOptions(overrides: Record<string, unknown> = {}) {
  return {
    searchParams: new URLSearchParams(
      "session=session-1&scenario=scenario-1&postInterview=true&startDebrief=true"
    ),
    hasUser: true,
    currentSessionId: "session-1",
    showPostInterviewDiscussion: true,
    interviewerMessages: [{ type: "ai", message: "Welcome" }],
    testResults: [],
    testSummary: { total: 1, passed: 1, failed: 0, passRate: 100 },
    triggerPostInterviewDiscussion: vi.fn(async () => true),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
})

describe("usePostInterviewResumeKickoff", () => {
  it("starts once after the migrated post-interview state is hydrated", async () => {
    const options = buildOptions()
    const { rerender } = renderHook((props) => usePostInterviewResumeKickoff(props as never), {
      initialProps: options,
    })

    await act(async () => {})
    rerender({ ...options, testResults: [] })
    await act(async () => {})

    expect(options.triggerPostInterviewDiscussion).toHaveBeenCalledTimes(1)
  })

  it("does not repeat a kickoff already stored in the transcript", async () => {
    const options = buildOptions({
      interviewerMessages: [
        { type: "ai", message: "What is the complexity?", phase: "post_interview" },
      ],
    })

    renderHook(() => usePostInterviewResumeKickoff(options as never))
    await act(async () => {})

    expect(options.triggerPostInterviewDiscussion).not.toHaveBeenCalled()
  })

  it("waits until the authenticated session reaches the post-interview view", async () => {
    const options = buildOptions({ showPostInterviewDiscussion: false })

    renderHook(() => usePostInterviewResumeKickoff(options as never))
    await act(async () => {})

    expect(options.triggerPostInterviewDiscussion).not.toHaveBeenCalled()
  })
})
