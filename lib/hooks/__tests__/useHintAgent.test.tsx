/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { useHintAgent } from "../useHintAgent"

const send = vi.hoisted(() => vi.fn())
vi.mock("@/lib/interview/session-fetch", () => ({ sessionFetch: send }))
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }))
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }))

beforeEach(() => {
  send.mockReset()
  send.mockResolvedValue({ ok: true, json: async () => ({ hints: [], hint: null }) })
})
afterEach(cleanup)

it("uses the current workspace language for initial and follow-up hints, including after a language change", async () => {
  const { result, rerender } = renderHook(
    ({ language }: { language: string }) =>
      useHintAgent({
        userId: "learner",
        sessionId: "attempt",
        problemId: "exception-handling",
        problemTitle: "Quota outage",
        problemText: "Investigate storage failures",
        language,
        difficulty: "medium",
        autoGenerate: false,
      }),
    { initialProps: { language: "python" } }
  )
  expect(send).not.toHaveBeenCalled()
  for (const language of ["python", "javascript"]) {
    rerender({ language })
    await act(async () => {
      await result.current.generateHints()
    })
    await act(async () => {
      await result.current.getNextHint()
    })
    const recent = send.mock.calls.slice(-2)
    expect(recent.map(([url, request]) => ({ url, ...JSON.parse(request.body) }))).toEqual([
      expect.objectContaining({
        url: "/api/agents/hints",
        action: "generate",
        language,
        sessionId: "attempt",
      }),
      expect.objectContaining({
        url: "/api/agents/hints",
        action: "get-next",
        language,
        sessionId: "attempt",
      }),
    ])
  }
})
