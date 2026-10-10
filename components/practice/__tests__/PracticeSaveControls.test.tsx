/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fixturePlan } from "@/lib/practice-plan/__tests__/fixtures"
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  writing: false,
  error: null as string | null,
  result: { status: "empty" },
}))
vi.mock("@/lib/hooks/usePracticePlan", () => ({ usePracticePlan: () => mocks }))
import { PracticeSaveControls } from "../PracticeSaveControls"
beforeEach(() => {
  vi.clearAllMocks()
  mocks.writing = false
  mocks.error = null
  mocks.save.mockResolvedValue(false)
})
afterEach(cleanup)
const show = () =>
  render(
    <PracticeSaveControls sourceSessionId="source" recommendation={fixturePlan.recommendation} />
  )
describe("save controls", () => {
  it("requires an explicit action for a save or reminder", () => {
    show()
    expect(mocks.save).not.toHaveBeenCalled()
    expect(screen.queryByLabelText(/email me/i)).toBeNull()
  })
  it("saves without email when Save for later is clicked", () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Save for later" }))
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ sourceSessionId: "source", scenarioId: "next", reminderAt: null })
    )
  })
  it("opening the reminder form schedules nothing", () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Remind me" }))
    expect(screen.getByLabelText(/email me after/i)).toBeTruthy()
    expect(mocks.save).not.toHaveBeenCalled()
  })
  it("rejects a stale time without making a request", () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Remind me" }))
    fireEvent.change(screen.getByLabelText(/email me after/i), {
      target: { value: "2020-01-01T10:00" },
    })
    fireEvent.submit(screen.getByRole("button", { name: /save and schedule/i }).closest("form")!)
    expect(screen.getByRole("alert")).toBeTruthy()
    expect(mocks.save).not.toHaveBeenCalled()
  })
  it("keeps errors inline and doesn't claim an unconfirmed save", () => {
    mocks.error = "Saving failed. Try again."
    show()
    expect(screen.getByRole("alert").textContent).toContain("Try again")
    expect(screen.queryByRole("status")).toBeNull()
  })
})
