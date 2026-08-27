/**
 * @vitest-environment jsdom
 *
 * WorkbookOverviewCta is the overview's resume-aware CTA. It must never send a signed-in learner
 * with an existing run back through "Start sprint 1", and it must never claim a run exists for a
 * guest.
 *
 * Assertions are plain DOM reads because this repo does not carry @testing-library/jest-dom.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mockAuth = vi.hoisted(() => ({ value: { user: null as unknown, initialized: true } }))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => mockAuth.value }))

const mockFetchRun = vi.hoisted(() => vi.fn())
vi.mock("@/lib/sprint-labs/runs-client", () => ({ fetchActiveSprintLabRun: mockFetchRun }))

import { WorkbookOverviewCta } from "../WorkbookOverviewCta"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("WorkbookOverviewCta", () => {
  it("sends a guest through sign-in, never claiming a run", () => {
    mockAuth.value = { user: null, initialized: true }
    render(<WorkbookOverviewCta workbookId="fixture-demo" />)
    const link = screen.getByRole("link", { name: "Sign in to start" })
    expect(link.getAttribute("href")).toBe(
      `/login?redirect=${encodeURIComponent("/sprint-labs/fixture-demo/run/standup")}`
    )
    expect(mockFetchRun).not.toHaveBeenCalled()
  })

  it("offers Start sprint 1 for a signed-in learner with no run", async () => {
    mockAuth.value = { user: { uid: "u1" }, initialized: true }
    mockFetchRun.mockResolvedValue(null)
    render(<WorkbookOverviewCta workbookId="fixture-demo" />)
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Start sprint 1" }).getAttribute("href")).toBe(
        "/sprint-labs/fixture-demo/run/standup"
      )
    })
  })

  it("offers Resume: <ticketKey> plus a Go to board link for a mid-ticket run", async () => {
    mockAuth.value = { user: { uid: "u1" }, initialized: true }
    mockFetchRun.mockResolvedValue({
      id: "run1",
      userId: "u1",
      workbookId: "fixture-demo",
      contentVersion: "v1",
      currentSprint: 3,
      currentTicketKey: "MER-303",
      board: {},
      status: "in_progress",
      startedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })
    render(<WorkbookOverviewCta workbookId="fixture-demo" />)
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Resume: MER-303" }).getAttribute("href")).toBe(
        "/sprint-labs/fixture-demo/run/ticket/MER-303"
      )
    })
    expect(screen.getByRole("link", { name: "Go to board" }).getAttribute("href")).toBe(
      "/sprint-labs/fixture-demo/run/board"
    )
  })

  it("offers Start sprint <N> standup when enrolled with no ticket picked yet", async () => {
    mockAuth.value = { user: { uid: "u1" }, initialized: true }
    mockFetchRun.mockResolvedValue({
      id: "run1",
      userId: "u1",
      workbookId: "fixture-demo",
      contentVersion: "v1",
      currentSprint: 4,
      board: {},
      status: "in_progress",
      startedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })
    render(<WorkbookOverviewCta workbookId="fixture-demo" />)
    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "Start sprint 4 standup" })).not.toBeNull()
    })
  })

  it("offers See your summary once the run is completed", async () => {
    mockAuth.value = { user: { uid: "u1" }, initialized: true }
    mockFetchRun.mockResolvedValue({
      id: "run1",
      userId: "u1",
      workbookId: "fixture-demo",
      contentVersion: "v1",
      currentSprint: 10,
      board: {},
      status: "completed",
      startedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-02-01T00:00:00.000Z",
    })
    render(<WorkbookOverviewCta workbookId="fixture-demo" />)
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "See your summary" }).getAttribute("href")).toBe(
        "/sprint-labs/fixture-demo/run/summary"
      )
    })
  })
})
