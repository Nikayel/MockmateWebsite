/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DebuggingReleaseBanner } from "../DebuggingReleaseBanner"
import { InterviewTrackHeader } from "../InterviewTrackHeader"
import { findInterviewTrack } from "../interview-tracks"
import { genericCacheEvictionMutationScenario } from "@/lib/scenarios/real-world/bugfix/packs/generic-cache-eviction-mutation"

beforeEach(() => {
  const stored = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("debugging notices", () => {
  it("offers the shipped Python incident without starting it and remembers dismissal", () => {
    const onView = vi.fn()
    const props = { scenario: genericCacheEvictionMutationScenario, onView }
    const view = render(<DebuggingReleaseBanner {...props} />)
    fireEvent.click(screen.getByRole("button", { name: "View question" }))
    expect(onView).toHaveBeenCalledTimes(1)
    expect(onView).toHaveBeenCalledWith(genericCacheEvictionMutationScenario)
    fireEvent.click(screen.getByRole("button", { name: "Dismiss new question banner" }))
    expect(screen.queryByRole("complementary")).toBeNull()
    view.unmount()
    render(<DebuggingReleaseBanner {...props} />)
    expect(screen.queryByRole("complementary")).toBeNull()
  })

  it("keeps the Beta context in debugging only", () => {
    const view = render(
      <InterviewTrackHeader track={findInterviewTrack("debugging")!} total={30} completed={2} />
    )
    expect(screen.getByText("Beta")).toBeTruthy()
    expect(screen.getByText(/working with recruiters/)).toBeTruthy()
    view.rerender(
      <InterviewTrackHeader track={findInterviewTrack("dsa")!} total={150} completed={2} />
    )
    expect(screen.queryByText("Beta")).toBeNull()
  })
})
