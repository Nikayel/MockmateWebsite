/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fixturePlan } from "@/lib/practice-plan/__tests__/fixtures"
import type { PracticePlanResponse } from "@/lib/practice-plan/schema"

const mocks = vi.hoisted(() => ({
  user: { uid: "owner" } as { uid: string } | null,
  get: vi.fn(),
  send: vi.fn(),
  track: vi.fn(),
}))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ firebaseUser: mocks.user }) }))
vi.mock("@/lib/hooks/useAuthedFetch", () => ({
  useAuthedFetch: () => ({ get: mocks.get, send: mocks.send }),
}))
vi.mock("@/lib/analytics", () => ({ trackEvent: mocks.track }))
import { SavedPracticeCard } from "../SavedPracticeCard"

function holdRead() {
  let finish!: (response: { ok: boolean; needsReauth?: boolean; data?: unknown }) => void
  mocks.get.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
  return finish
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.user = { uid: "owner" }
})
afterEach(cleanup)

describe("optional saved practice on the dashboard", () => {
  it.each<PracticePlanResponse>([
    { status: "empty" },
    { status: "ready", plan: fixturePlan },
    { status: "complete", plan: fixturePlan, completedSessionId: "completed", observations: [] },
  ])("waits for a confirmed $status response before showing a card", async (response) => {
    const finish = holdRead()
    render(
      <>
        <SavedPracticeCard />
        <h2>Recent sessions</h2>
      </>
    )
    expect(mocks.get).toHaveBeenCalledWith("/api/practice-plan", {
      signal: expect.any(AbortSignal),
    })
    expect(screen.queryByRole("region", { name: "Saved next practice" })).toBeNull()
    expect(screen.getByRole("heading", { name: "Recent sessions" })).toBeTruthy()
    expect(mocks.track).not.toHaveBeenCalled()
    await act(async () => finish({ ok: true, data: response }))
    if (response.status === "empty") {
      expect(screen.queryByRole("region", { name: "Saved next practice" })).toBeNull()
    } else {
      expect(screen.getByRole("heading", { name: "Next task" })).toBeTruthy()
      expect(
        screen.getByRole("link", {
          name:
            response.status === "complete"
              ? "Review feedback and choose your next task"
              : "Open saved practice",
        })
      ).toBeTruthy()
      expect(mocks.track).toHaveBeenCalledTimes(1)
    }
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it("does not request or display a task while signed out", () => {
    mocks.user = null
    const { container } = render(<SavedPracticeCard />)
    expect(container.textContent).toBe("")
    expect(mocks.get).not.toHaveBeenCalled()
  })

  it.each([false, true])(
    "keeps recovery available after a read fails (reauth: %s)",
    async (reauth) => {
      const finish = holdRead()
      render(<SavedPracticeCard />)
      await act(async () => finish({ ok: false, needsReauth: reauth }))
      expect(screen.getByRole("status").textContent).toContain(
        reauth ? "Sign in again" : "We couldn't load"
      )
      const retry = holdRead()
      fireEvent.click(screen.getByRole("button", { name: "Try again" }))
      expect(screen.queryByText("Loading your saved task…")).toBeNull()
      await act(async () => retry({ ok: true, data: { status: "ready", plan: fixturePlan } }))
      expect(screen.getByRole("link", { name: "Open saved practice" })).toBeTruthy()
      expect(mocks.get).toHaveBeenCalledTimes(2)
    }
  )

  it("does not show the previous account's task while checking another account", async () => {
    mocks.get.mockResolvedValueOnce({ ok: true, data: { status: "ready", plan: fixturePlan } })
    const { rerender } = render(<SavedPracticeCard />)
    expect(await screen.findByRole("heading", { name: "Next task" })).toBeTruthy()
    const finish = holdRead()
    mocks.user = { uid: "another-owner" }
    rerender(<SavedPracticeCard />)
    expect(screen.queryByRole("region", { name: "Saved next practice" })).toBeNull()
    await act(async () => finish({ ok: true, data: { status: "empty" } }))
    expect(screen.queryByRole("region", { name: "Saved next practice" })).toBeNull()
  })
})
