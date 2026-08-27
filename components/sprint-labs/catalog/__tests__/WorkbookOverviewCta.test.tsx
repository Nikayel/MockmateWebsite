/**
 * @vitest-environment jsdom
 *
 * WorkbookOverviewCta is the overview's resume-aware CTA, purely presentational as of fix round 1
 * (I2+I3): the fetch that used to live here now lives once in `WorkbookOverviewShell`, and this
 * component only renders whatever `RunLookupState` it is handed. It must never send a signed-in
 * learner with an existing run back through "Start sprint 1", never claim a run exists for a guest,
 * and the "repeat" position must never show its own loader (the one-Sparra rule; that is the shell's
 * job, tested in WorkbookOverviewShell.test.tsx).
 *
 * Assertions are plain DOM reads because this repo does not carry @testing-library/jest-dom.
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { WorkbookOverviewCta, type RunLookupState } from "../WorkbookOverviewCta"
import type { SprintLabRunRecord } from "@/lib/sprint-labs/runs-client"

afterEach(cleanup)

const BASE_RUN: SprintLabRunRecord = {
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
}

function runState(overrides: Partial<SprintLabRunRecord>): RunLookupState {
  return { kind: "run", run: { ...BASE_RUN, ...overrides } }
}

describe("WorkbookOverviewCta", () => {
  it("sends a guest through sign-in, never claiming a run", () => {
    render(<WorkbookOverviewCta workbookId="fixture-demo" state={{ kind: "signed-out" }} />)
    const link = screen.getByRole("link", { name: "Sign in to start" })
    expect(link.getAttribute("href")).toBe(
      `/login?redirect=${encodeURIComponent("/sprint-labs/fixture-demo/run/standup")}`
    )
  })

  it("offers Start sprint 1 for a signed-in learner with no run", () => {
    render(<WorkbookOverviewCta workbookId="fixture-demo" state={{ kind: "no-run" }} />)
    expect(screen.getByRole("link", { name: "Start sprint 1" }).getAttribute("href")).toBe(
      "/sprint-labs/fixture-demo/run/standup"
    )
  })

  it("offers Resume: <ticketKey> plus a Go to board link for a mid-ticket run", () => {
    render(<WorkbookOverviewCta workbookId="fixture-demo" state={runState({})} />)
    expect(screen.getByRole("link", { name: "Resume: MER-303" }).getAttribute("href")).toBe(
      "/sprint-labs/fixture-demo/run/ticket/MER-303"
    )
    expect(screen.getByRole("link", { name: "Go to board" }).getAttribute("href")).toBe(
      "/sprint-labs/fixture-demo/run/board"
    )
  })

  it("offers Start sprint <N> standup when enrolled with no ticket picked yet", () => {
    render(
      <WorkbookOverviewCta
        workbookId="fixture-demo"
        state={runState({ currentTicketKey: undefined, currentSprint: 4 })}
      />
    )
    expect(screen.queryByRole("link", { name: "Start sprint 4 standup" })).not.toBeNull()
  })

  it("offers See your summary once the run is completed", () => {
    render(
      <WorkbookOverviewCta
        workbookId="fixture-demo"
        state={runState({ status: "completed", completedAt: "2026-02-01T00:00:00.000Z" })}
      />
    )
    expect(screen.getByRole("link", { name: "See your summary" }).getAttribute("href")).toBe(
      "/sprint-labs/fixture-demo/run/summary"
    )
  })

  it("shows the loader at the primary position while loading", () => {
    render(
      <WorkbookOverviewCta
        workbookId="fixture-demo"
        state={{ kind: "loading" }}
        position="primary"
      />
    )
    expect(screen.getByRole("status")).not.toBeNull()
  })

  it("renders nothing at the repeat position while loading, per the one-Sparra rule", () => {
    const { container } = render(
      <WorkbookOverviewCta
        workbookId="fixture-demo"
        state={{ kind: "loading" }}
        position="repeat"
      />
    )
    expect(container.textContent).toBe("")
    expect(screen.queryByRole("status")).toBeNull()
  })
})
