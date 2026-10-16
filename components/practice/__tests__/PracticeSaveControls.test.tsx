/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fixturePlan } from "@/lib/practice-plan/__tests__/fixtures"
import type { usePracticePlan } from "@/lib/hooks/usePracticePlan"
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  writing: false,
  error: null as string | null,
  result: { status: "empty" } as ReturnType<typeof usePracticePlan>["result"],
}))
vi.mock("@/lib/hooks/usePracticePlan", () => ({ usePracticePlan: () => mocks }))
import { PracticeSaveControls } from "../PracticeSaveControls"
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-10-15T14:00:00.000Z"))
  vi.clearAllMocks()
  mocks.writing = false
  mocks.error = null
  mocks.result = { status: "empty" }
  mocks.save.mockResolvedValue(false)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
const show = () =>
  render(
    <PracticeSaveControls sourceSessionId="source" recommendation={fixturePlan.recommendation} />
  )
describe("save controls", () => {
  it("replaces save actions with confirmation once a reminder is scheduled", () => {
    mocks.result = {
      status: "ready",
      plan: {
        ...fixturePlan,
        reminderStatus: "pending",
        reminderAt: "2026-10-16T14:00:00.000Z",
      },
    }
    show()
    expect(screen.queryByRole("button", { name: "Save without reminder" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Remind me", exact: true })).toBeNull()
    expect(screen.getByRole("status").textContent).toContain("Reminder set")
    expect(screen.getByRole("button", { name: "Edit reminder" })).toBeTruthy()
    expect(mocks.save).not.toHaveBeenCalled()
  })
  it("requires an explicit action for a save or reminder", () => {
    show()
    expect(mocks.save).not.toHaveBeenCalled()
    expect(screen.queryByLabelText(/email me/i)).toBeNull()
    expect(screen.queryByRole("button", { name: /remind/i })).toBeNull()
    expect(screen.getAllByRole("button")).toHaveLength(1)
  })
  it("saves without email when Save for later is clicked", () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Save for later" }))
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ sourceSessionId: "source", scenarioId: "next", reminderAt: null })
    )
  })
  it("opening the reminder form schedules nothing", () => {
    mocks.result = { status: "ready", plan: fixturePlan }
    show()
    fireEvent.click(screen.getByRole("button", { name: "Add reminder" }))
    expect(screen.getByLabelText("Email me a reminder")).toBeTruthy()
    expect(mocks.save).not.toHaveBeenCalled()
  })
  it("rejects a stale time without making a request", () => {
    mocks.result = { status: "ready", plan: fixturePlan }
    show()
    fireEvent.click(screen.getByRole("button", { name: "Add reminder" }))
    fireEvent.change(screen.getByLabelText("Email me a reminder"), {
      target: { value: "2020-01-01T10:00" },
    })
    fireEvent.submit(screen.getByRole("form", { name: "Email reminder" }))
    expect(screen.getByRole("alert")).toBeTruthy()
    expect(mocks.save).not.toHaveBeenCalled()
  })
  it("closes the form and replaces save actions after an accepted reminder", async () => {
    mocks.result = { status: "ready", plan: fixturePlan }
    const reminderAt = "2026-10-16T14:00:00.000Z"
    mocks.save.mockImplementation(async () => {
      mocks.result = {
        status: "ready",
        plan: { ...fixturePlan, reminderStatus: "pending", reminderAt },
      }
      return true
    })
    show()
    fireEvent.click(screen.getByRole("button", { name: "Add reminder" }))
    fireEvent.submit(screen.getByRole("form", { name: "Email reminder" }))
    await waitFor(() => expect(screen.queryByRole("form")).toBeNull())
    expect(mocks.save).toHaveBeenCalledTimes(1)
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ reminderAt: expect.any(String) })
    )
    expect(screen.getByRole("status").textContent).toContain("Reminder set")
    expect(screen.getByRole("button", { name: "Edit reminder" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Add reminder" })).toBeNull()
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull()
    expect(screen.getByRole("status").querySelector("time")?.dateTime).toBe(reminderAt)
    expect(screen.getByRole("status").querySelector("time")?.textContent).not.toMatch(
      /:\d{2}:\d{2}/
    )
  })
  it("prefills the saved time and only cancels the reminder through an explicit action", async () => {
    const reminderAt = "2026-10-16T14:00:00.000Z"
    mocks.result = {
      status: "ready",
      plan: { ...fixturePlan, reminderStatus: "pending", reminderAt },
    }
    show()
    fireEvent.click(screen.getByRole("button", { name: "Edit reminder" }))
    const input = screen.getByLabelText<HTMLInputElement>("Email me a reminder")
    expect(new Date(input.value).toISOString()).toBe(reminderAt)
    fireEvent.click(screen.getByRole("button", { name: "Cancel", exact: true }))
    expect(screen.queryByRole("form")).toBeNull()
    expect(mocks.save).not.toHaveBeenCalled()
    mocks.save.mockImplementation(async () => {
      mocks.result = { status: "ready", plan: fixturePlan }
      return true
    })
    fireEvent.click(screen.getByRole("button", { name: "Edit reminder" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel reminder" }))
    await waitFor(() => expect(screen.queryByRole("form")).toBeNull())
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ reminderAt: null }))
    expect(screen.getByRole("status").textContent).toContain("No email reminder")
    expect(screen.getByRole("button", { name: "Add reminder" })).toBeTruthy()
  })
  it("keeps the current reminder and editor when a change fails", async () => {
    mocks.result = {
      status: "ready",
      plan: { ...fixturePlan, reminderStatus: "pending", reminderAt: "2026-10-16T14:00:00.000Z" },
    }
    mocks.error = "Could not update your reminder. Try again."
    show()
    fireEvent.click(screen.getByRole("button", { name: "Edit reminder" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel reminder" }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
    expect(screen.getByRole("form", { name: "Email reminder" })).toBeTruthy()
    expect(screen.getByRole("status").textContent).toContain("Reminder set")
    expect(screen.getByRole("alert").textContent).toContain("Try again")
  })
  it("does not offer another reminder while one is sending or the task is complete", () => {
    mocks.result = { status: "ready", plan: { ...fixturePlan, reminderStatus: "sending" } }
    const view = show()
    expect(screen.getByRole("status").textContent).toContain("Reminder sending")
    expect(screen.queryByRole("button")).toBeNull()
    mocks.result = {
      status: "complete",
      plan: fixturePlan,
      completedSessionId: "completed",
      observations: [],
    }
    view.rerender(
      <PracticeSaveControls sourceSessionId="source" recommendation={fixturePlan.recommendation} />
    )
    expect(screen.getByRole("status").textContent).toContain("Practice completed")
    expect(screen.queryByRole("button")).toBeNull()
  })
  it("shows replacement details only when there is a different saved task", () => {
    mocks.result = {
      status: "ready",
      plan: {
        ...fixturePlan,
        sourceSessionId: "another-session",
        reminderStatus: "pending",
        reminderAt: "2026-10-16T14:00:00.000Z",
      },
    }
    show()
    expect(screen.getByText(/Saving replaces/).textContent).toContain("cancels its reminder")
    expect(screen.queryByRole("status")).toBeNull()
    expect(screen.getByRole("button", { name: "Save for later" })).toBeTruthy()
  })
  it("waits for the existing plan before enabling Save for later", () => {
    mocks.result = { status: "loading" }
    show()
    fireEvent.click(screen.getByRole("button", { name: "Save for later" }))
    expect(mocks.save).not.toHaveBeenCalled()
  })
  it("keeps errors inline and doesn't claim an unconfirmed save", () => {
    mocks.error = "Saving failed. Try again."
    show()
    expect(screen.getByRole("alert").textContent).toContain("Try again")
    expect(screen.queryByRole("status")).toBeNull()
  })
})
