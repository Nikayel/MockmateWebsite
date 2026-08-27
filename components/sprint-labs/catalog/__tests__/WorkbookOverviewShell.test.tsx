/**
 * @vitest-environment jsdom
 *
 * WorkbookOverviewShell is the single client boundary that fetches the active run once and feeds
 * it to the top CTA, `SprintMap`'s `currentSprint`, and the repeat CTA (fix round 1, I2+I3). The
 * two defects this pins: two authenticated fetches for one fact, and `SprintMap` never receiving a
 * live `currentSprint` at all.
 *
 * Assertions are plain DOM reads because this repo does not carry @testing-library/jest-dom.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mockAuth = vi.hoisted(() => ({ value: { user: null as unknown, initialized: true } }))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => mockAuth.value }))

const mockFetchRun = vi.hoisted(() => vi.fn())
vi.mock("@/lib/sprint-labs/runs-client", () => ({ fetchActiveSprintLabRun: mockFetchRun }))

import { WorkbookOverviewShell } from "../WorkbookOverviewShell"
import type { SprintPublic } from "@/lib/sprint-labs/types"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function sprint(number: number, title: string): SprintPublic {
  return {
    number,
    title,
    goal: `Goal ${number}`,
    standupQuote: "quote",
    archMapDelta: { added: [], changed: [], broke: [], invariants: [] },
    objectives: [],
  }
}

const SPRINTS: SprintPublic[] = [sprint(1, "Foundations"), sprint(2, "Money and Time")]

describe("WorkbookOverviewShell", () => {
  it("fetches the active run exactly once, even though it renders two CTA slots", async () => {
    mockAuth.value = { user: { uid: "u1" }, initialized: true }
    mockFetchRun.mockResolvedValue(null)
    render(
      <WorkbookOverviewShell workbookId="fixture-demo" sprints={SPRINTS} meterLine="meter">
        <p>middle</p>
      </WorkbookOverviewShell>
    )
    // Both CTA slots (top + repeat) render the SAME resolved state once it settles, so both show
    // "Start sprint 1" — the fix is that there is only ever ONE fetch behind them, asserted below.
    await waitFor(() => {
      expect(screen.queryAllByRole("link", { name: "Start sprint 1" }).length).toBe(2)
    })
    expect(mockFetchRun).toHaveBeenCalledTimes(1)
  })

  it("shows exactly one loader while resolving, never two, even with two CTA slots on screen", () => {
    mockAuth.value = { user: { uid: "u1" }, initialized: true }
    mockFetchRun.mockReturnValue(new Promise(() => {})) // never resolves during this test
    render(
      <WorkbookOverviewShell workbookId="fixture-demo" sprints={SPRINTS} meterLine="meter">
        <p>middle</p>
      </WorkbookOverviewShell>
    )
    expect(screen.getAllByRole("status")).toHaveLength(1)
  })

  it("passes the resolved run's currentSprint into SprintMap so done/current render", async () => {
    mockAuth.value = { user: { uid: "u1" }, initialized: true }
    mockFetchRun.mockResolvedValue({
      id: "run1",
      userId: "u1",
      workbookId: "fixture-demo",
      contentVersion: "v1",
      currentSprint: 2,
      currentTicketKey: "MER-201",
      board: {},
      status: "in_progress",
      startedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })
    render(
      <WorkbookOverviewShell workbookId="fixture-demo" sprints={SPRINTS} meterLine="meter">
        <p>middle</p>
      </WorkbookOverviewShell>
    )
    await waitFor(() => {
      expect(screen.getByText("Done")).not.toBeNull()
    })
    expect(screen.getByText("Current sprint")).not.toBeNull()
  })

  it("renders the static children between the top CTA and the arc", async () => {
    mockAuth.value = { user: null, initialized: true }
    render(
      <WorkbookOverviewShell workbookId="fixture-demo" sprints={SPRINTS} meterLine="meter">
        <p>the static middle content</p>
      </WorkbookOverviewShell>
    )
    expect(screen.getByText("the static middle content")).not.toBeNull()
    expect(mockFetchRun).not.toHaveBeenCalled()
  })
})
