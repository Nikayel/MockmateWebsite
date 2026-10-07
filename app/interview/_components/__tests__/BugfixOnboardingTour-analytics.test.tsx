/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const track = vi.hoisted(() => vi.fn())
vi.mock("@/lib/analytics", () => ({ trackEvent: track }))
vi.mock("firebase/firestore", () => ({ doc: vi.fn(), setDoc: vi.fn() }))
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: { div: ({ children }: { children: ReactNode }) => <div>{children}</div> },
  useReducedMotion: () => true,
}))
vi.mock("../_sub/BugfixTourStep", () => ({
  BugfixTourStep: ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => (
    <div>
      <button onClick={onNext}>Next step</button>
      <button onClick={onBack}>Previous step</button>
    </div>
  ),
}))
import { BugfixOnboardingTour } from "../BugfixOnboardingTour"

const scrollIntoView = vi.fn()
const props = {
  activePanel: "problem" as const,
  enabled: true,
  isAIPartnerExpanded: false,
  onAIPartnerExpandedChange: vi.fn(),
  onActivePanelChange: vi.fn(),
  scenarioId: "bugfix-example",
  testResultsCount: 0,
}
const viewed = () => track.mock.calls.filter(([event]) => event === "bugfix_tour_step_viewed")

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  const stored = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  })
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 20,
    top: 20,
    right: 300,
    bottom: 120,
    width: 280,
    height: 100,
    x: 20,
    y: 20,
    toJSON: () => ({}),
  })
  HTMLElement.prototype.scrollIntoView = scrollIntoView
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function startTour() {
  render(
    <>
      <div data-bugfix-tour="incident-report" />
      <div data-bugfix-tour="workspace-files" />
      <BugfixOnboardingTour {...props} />
    </>
  )
  fireEvent.click(screen.getByRole("button", { name: "Start tour" }))
  act(() => vi.advanceTimersByTime(180))
}

describe("tour analytics", () => {
  it("reports one view and scrolls once despite many geometry updates", () => {
    startTour()
    act(() => {
      for (let count = 0; count < 150; count++) {
        window.dispatchEvent(new Event("scroll"))
        window.dispatchEvent(new Event("resize"))
      }
    })
    expect(viewed()).toHaveLength(1)
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it("reports actual step entries, including back navigation and replay", () => {
    startTour()
    fireEvent.click(screen.getByRole("button", { name: "Next step" }))
    act(() => vi.advanceTimersByTime(180))
    fireEvent.click(screen.getByRole("button", { name: "Previous step" }))
    act(() => vi.advanceTimersByTime(180))
    fireEvent.keyDown(window, { key: "Escape" })
    act(() => window.dispatchEvent(new Event("codesparring:bugfix-tour-replay")))
    act(() => vi.advanceTimersByTime(180))
    expect(viewed().map(([, properties]) => properties.step_id)).toEqual([
      "incident-report",
      "workspace-files",
      "incident-report",
      "incident-report",
    ])
  })
})
