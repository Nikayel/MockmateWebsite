// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ProfilePersonalizationPrompt } from "./ProfilePersonalizationPrompt"

const mocks = vi.hoisted(() => ({
  complete: vi.fn(async () => undefined),
  track: vi.fn(),
}))

vi.mock("@/lib/onboarding/onboarding-service", () => ({
  completeProfilePersonalization: mocks.complete,
}))

vi.mock("@/lib/analytics", () => ({ trackEvent: mocks.track }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("ProfilePersonalizationPrompt", () => {
  it("keeps the prominent prompt visible when the dialog is closed without saving", () => {
    render(
      <ProfilePersonalizationPrompt
        userId="user-1"
        source="feedback"
        profile={null}
        onCompleted={() => undefined}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /personalize my plan/i }))
    fireEvent.click(screen.getByRole("button", { name: /close/i }))

    expect(screen.getByRole("heading", { name: /make the next round yours/i })).toBeTruthy()
    expect(mocks.complete).not.toHaveBeenCalled()
  })

  it("collects three preference steps and reports completion", async () => {
    const onCompleted = vi.fn()
    render(
      <ProfilePersonalizationPrompt
        userId="user-1"
        source="feedback"
        profile={null}
        onCompleted={onCompleted}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /personalize my plan/i }))
    fireEvent.click(screen.getByRole("radio", { name: /new grad \/ junior/i }))
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    fireEvent.click(await screen.findByRole("radio", { name: /startup/i }))
    fireEvent.click(screen.getByRole("button", { name: /within a month/i }))
    fireEvent.change(screen.getByLabelText(/target company/i), { target: { value: "Linear" } })
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    fireEvent.click(await screen.findByRole("radio", { name: /3 sessions \/ week/i }))
    fireEvent.click(screen.getByRole("button", { name: /save my plan/i }))

    const expected = {
      role: "junior",
      goal: "startup",
      targetCompany: "Linear",
      interviewTimeline: "within_month",
      weeklyGoal: 3,
    }
    await waitFor(() => expect(mocks.complete).toHaveBeenCalledWith("user-1", expected))
    expect(onCompleted).toHaveBeenCalledWith(expected)
    expect(mocks.track).toHaveBeenCalledWith(
      "profile_personalization_completed",
      expect.objectContaining({ source: "feedback", weekly_goal: 3 })
    )
  })
})
