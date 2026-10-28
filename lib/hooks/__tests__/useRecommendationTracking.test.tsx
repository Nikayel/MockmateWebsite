/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  user: { uid: "owner" } as { uid: string } | null,
}))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ firebaseUser: mocks.user }) }))
vi.mock("../useAuthedFetch", () => ({ useAuthedFetch: () => ({ send: mocks.send }) }))
import { useRecommendationTracking } from "../useRecommendationTracking"

let intersect: (ratio: number) => void
let visible = true
function Card({ id = "a".repeat(64) }: { id?: string }) {
  const { ref, reportClick } = useRecommendationTracking(id, "feedback")
  return (
    <section ref={ref}>
      <button onClick={reportClick}>Open</button>
    </section>
  )
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mocks.user = { uid: "owner" }
  mocks.send.mockResolvedValue({ ok: true })
  visible = true
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() =>
    visible ? "visible" : "hidden"
  )
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
        intersect = (ratio) => callback([{ intersectionRatio: ratio, isIntersecting: ratio > 0 }])
      }
      observe() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it("requires continuous 50% visibility for a second; hidden tabs reset the dwell", async () => {
  render(<Card />)
  await act(() => vi.advanceTimersByTimeAsync(2_000))
  expect(mocks.send).not.toHaveBeenCalled()
  act(() => intersect(0.49))
  await act(() => vi.advanceTimersByTimeAsync(2_000))
  expect(mocks.send).not.toHaveBeenCalled()
  act(() => intersect(0.5))
  await act(() => vi.advanceTimersByTimeAsync(800))
  visible = false
  fireEvent(document, new Event("visibilitychange"))
  await act(() => vi.advanceTimersByTimeAsync(2_000))
  expect(mocks.send).not.toHaveBeenCalled()
  visible = true
  fireEvent(document, new Event("visibilitychange"))
  await act(() => vi.advanceTimersByTimeAsync(1_000))
  expect(mocks.send).toHaveBeenCalledWith(
    "/api/recommendations/interaction",
    "POST",
    {
      decisionId: "a".repeat(64),
      stage: "viewed",
      returnSource: "feedback",
    },
    { keepalive: true }
  )
  act(() => intersect(0))
  act(() => intersect(1))
  await act(() => vi.advanceTimersByTimeAsync(2_000))
  expect(mocks.send).toHaveBeenCalledTimes(1)
})

it("records a fast click without inventing a view and never blocks navigation on telemetry failure", async () => {
  mocks.send.mockRejectedValue(new Error("offline"))
  render(<Card />)
  fireEvent.click(screen.getByText("Open"))
  fireEvent.click(screen.getByText("Open"))
  await act(async () => {})
  expect(mocks.send).toHaveBeenCalledTimes(1)
  expect(mocks.send.mock.calls[0][2].stage).toBe("clicked")
})

it("cleans pending views on unmount and does no work while signed out", async () => {
  const card = render(<Card />)
  act(() => intersect(1))
  card.unmount()
  await act(() => vi.advanceTimersByTimeAsync(2_000))
  expect(mocks.send).not.toHaveBeenCalled()
  mocks.user = null
  render(<Card />)
  fireEvent.click(screen.getByText("Open"))
  expect(mocks.send).not.toHaveBeenCalled()
})

it("keeps new decisions and accounts independent", async () => {
  const card = render(<Card />)
  fireEvent.click(screen.getByText("Open"))
  card.rerender(<Card id={"b".repeat(64)} />)
  fireEvent.click(screen.getByText("Open"))
  mocks.user = { uid: "other" }
  card.rerender(<Card id={"b".repeat(64)} />)
  fireEvent.click(screen.getByText("Open"))
  await act(async () => {})
  expect(mocks.send).toHaveBeenCalledTimes(3)
})
