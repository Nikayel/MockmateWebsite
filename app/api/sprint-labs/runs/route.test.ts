/**
 * Route-level tests for the two fix-round-2 findings that live in the
 * request-handling orchestration itself, not the service layer (already
 * fully covered in lib/sprint-labs/__tests__/runs.test.ts):
 *
 *  - OPEN 2: an invalid advance-sprint request must not spend quota before
 *    being rejected.
 *  - Controller addition 3: PATCH move-ticket must gate on Pro when the
 *    run's current sprint is already >= 2.
 *
 * Mocks every module the route imports except the pieces that are pure and
 * safe to run for real (`@/lib/sprint-labs/runs`'s schemas, error constants,
 * and `sprintLabRunErrorStatus`, plus the real `requireTierForSprint` from
 * `@/lib/sprint-labs/route-guards`, whose only dependency —
 * `requireTierForUser` — is mocked here) so the actual gating thresholds are
 * exercised, not just trusted.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifyAuth: vi.fn(),
  getFlagAsync: vi.fn(),
  requireTierForUser: vi.fn(),
  recordSessionStartAdmin: vi.fn(),
  loggerError: vi.fn(),
  getSprintLabRun: vi.fn(),
  getActiveSprintLabRun: vi.fn(),
  createSprintLabRun: vi.fn(),
  moveSprintLabTicket: vi.fn(),
  advanceSprintLabRun: vi.fn(),
  requireOwnedActiveRun: vi.fn(),
  requireKnownWorkbookAndTickets: vi.fn(),
}))

vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: mocks.verifyAuth }))
vi.mock("@/lib/feature-flags", () => ({ getFlagAsync: mocks.getFlagAsync }))
vi.mock("@/lib/quota-enforcement", () => ({ requireTierForUser: mocks.requireTierForUser }))
vi.mock("@/lib/quota/session-start-admin", () => ({
  recordSessionStartAdmin: mocks.recordSessionStartAdmin,
}))
vi.mock("@/lib/logger", () => ({ logger: { error: mocks.loggerError } }))

vi.mock("@/lib/sprint-labs/runs", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/sprint-labs/runs")>("@/lib/sprint-labs/runs")
  return {
    ...actual,
    getSprintLabRun: mocks.getSprintLabRun,
    getActiveSprintLabRun: mocks.getActiveSprintLabRun,
    createSprintLabRun: mocks.createSprintLabRun,
    moveSprintLabTicket: mocks.moveSprintLabTicket,
    advanceSprintLabRun: mocks.advanceSprintLabRun,
    requireOwnedActiveRun: mocks.requireOwnedActiveRun,
    requireKnownWorkbookAndTickets: mocks.requireKnownWorkbookAndTickets,
  }
})

function createRequest(body: unknown): NextRequest {
  return {
    headers: { get: (name: string) => (name === "Authorization" ? "Bearer valid-token" : null) },
    json: () => Promise.resolve(body),
  } as unknown as NextRequest
}

type StubResponse = { status: number; data?: Record<string, unknown> }

const USER = "user-1"

function baseRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "run1",
    userId: USER,
    workbookId: "meridian",
    contentVersion: "v1",
    currentSprint: 1,
    board: { "MER-101": "todo" },
    status: "in_progress",
    startedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("PATCH /api/sprint-labs/runs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: USER })
    mocks.getFlagAsync.mockResolvedValue(true)
    // Default to "allowed" so tests that don't care about the tier gate
    // don't need to configure it; the specific Pro-required tests override
    // this to a blocking response.
    mocks.requireTierForUser.mockResolvedValue({ allowed: true })
  })

  describe("advance-sprint (OPEN 2: validate before spending quota)", () => {
    it("rejects an invalid sprint sequence WITHOUT ever calling recordSessionStartAdmin", async () => {
      // currentSprint is 1; requesting toSprint: 3 skips a sprint.
      mocks.requireOwnedActiveRun.mockResolvedValue(baseRun({ currentSprint: 1 }))
      const { PATCH } = await import("./route")

      const response = (await PATCH(
        createRequest({ action: "advance-sprint", runId: "run1", toSprint: 3, ticketKeys: [] })
      )) as unknown as StubResponse

      expect(response.status).toBe(409)
      expect(mocks.recordSessionStartAdmin).not.toHaveBeenCalled()
      expect(mocks.advanceSprintLabRun).not.toHaveBeenCalled()
    })

    it("rejects an inactive (completed) run WITHOUT ever calling recordSessionStartAdmin", async () => {
      mocks.requireOwnedActiveRun.mockRejectedValue(new Error("RUN_NOT_ACTIVE"))
      const { PATCH } = await import("./route")

      const response = (await PATCH(
        createRequest({ action: "advance-sprint", runId: "run1", toSprint: 2, ticketKeys: [] })
      )) as unknown as StubResponse

      expect(response.status).toBe(409)
      expect(mocks.recordSessionStartAdmin).not.toHaveBeenCalled()
      expect(mocks.advanceSprintLabRun).not.toHaveBeenCalled()
    })

    it("rejects unknown registry content (forged ticket key) WITHOUT ever calling recordSessionStartAdmin", async () => {
      mocks.requireOwnedActiveRun.mockResolvedValue(baseRun({ currentSprint: 1 }))
      mocks.requireKnownWorkbookAndTickets.mockRejectedValue(new Error("VALIDATION_FAILED"))
      const { PATCH } = await import("./route")

      const response = (await PATCH(
        createRequest({
          action: "advance-sprint",
          runId: "run1",
          toSprint: 2,
          ticketKeys: ["MER-FORGED"],
        })
      )) as unknown as StubResponse

      expect(response.status).toBe(400)
      expect(mocks.recordSessionStartAdmin).not.toHaveBeenCalled()
      expect(mocks.advanceSprintLabRun).not.toHaveBeenCalled()
    })

    it("spends quota only AFTER validation passes, then advances", async () => {
      mocks.requireOwnedActiveRun.mockResolvedValue(baseRun({ currentSprint: 1 }))
      mocks.requireKnownWorkbookAndTickets.mockResolvedValue(undefined)
      mocks.recordSessionStartAdmin.mockResolvedValue({
        success: true,
        sessionsUsed: 1,
        sessionsLimit: 8,
      })
      mocks.advanceSprintLabRun.mockResolvedValue(baseRun({ currentSprint: 2 }))
      const { PATCH } = await import("./route")

      const response = (await PATCH(
        createRequest({
          action: "advance-sprint",
          runId: "run1",
          toSprint: 2,
          ticketKeys: ["MER-201"],
        })
      )) as unknown as StubResponse

      expect(response.status).toBe(200)
      expect(mocks.recordSessionStartAdmin).toHaveBeenCalledTimes(1)
      expect(mocks.recordSessionStartAdmin).toHaveBeenCalledWith(USER, "sprint-labs:meridian:2")
      expect(mocks.advanceSprintLabRun).toHaveBeenCalledTimes(1)
    })

    it("gates on Pro for toSprint >= 2 before quota, and never spends quota when Pro is required but missing", async () => {
      mocks.requireOwnedActiveRun.mockResolvedValue(baseRun({ currentSprint: 1 }))
      mocks.requireKnownWorkbookAndTickets.mockResolvedValue(undefined)
      mocks.requireTierForUser.mockResolvedValue({
        allowed: false,
        response: { status: 403, data: { error: "Pro feature required" } },
      })
      const { PATCH } = await import("./route")

      const response = (await PATCH(
        createRequest({ action: "advance-sprint", runId: "run1", toSprint: 2, ticketKeys: [] })
      )) as unknown as StubResponse

      expect(response.status).toBe(403)
      expect(mocks.recordSessionStartAdmin).not.toHaveBeenCalled()
      expect(mocks.advanceSprintLabRun).not.toHaveBeenCalled()
    })
  })

  describe("move-ticket (controller addition 3: Pro gate on sprint >= 2)", () => {
    it("REJECTS a free user's move on a run already at sprint 3", async () => {
      mocks.getSprintLabRun.mockResolvedValue(baseRun({ currentSprint: 3 }))
      mocks.requireTierForUser.mockResolvedValue({
        allowed: false,
        response: { status: 403, data: { error: "Pro feature required" } },
      })
      const { PATCH } = await import("./route")

      const response = (await PATCH(
        createRequest({ action: "move-ticket", runId: "run1", ticketKey: "MER-301", to: "doing" })
      )) as unknown as StubResponse

      expect(response.status).toBe(403)
      expect(mocks.moveSprintLabTicket).not.toHaveBeenCalled()
    })

    it("ALLOWS a free user's move on a sprint-1 run (no tier check triggered)", async () => {
      mocks.getSprintLabRun.mockResolvedValue(baseRun({ currentSprint: 1 }))
      mocks.moveSprintLabTicket.mockResolvedValue(baseRun({ board: { "MER-101": "doing" } }))
      const { PATCH } = await import("./route")

      const response = (await PATCH(
        createRequest({ action: "move-ticket", runId: "run1", ticketKey: "MER-101", to: "doing" })
      )) as unknown as StubResponse

      expect(response.status).toBe(200)
      expect(mocks.requireTierForUser).not.toHaveBeenCalled()
      expect(mocks.moveSprintLabTicket).toHaveBeenCalledTimes(1)
    })

    it("ALLOWS a Pro user's move on a sprint-3 run", async () => {
      mocks.getSprintLabRun.mockResolvedValue(baseRun({ currentSprint: 3 }))
      mocks.requireTierForUser.mockResolvedValue({ allowed: true })
      mocks.moveSprintLabTicket.mockResolvedValue(baseRun({ currentSprint: 3 }))
      const { PATCH } = await import("./route")

      const response = (await PATCH(
        createRequest({ action: "move-ticket", runId: "run1", ticketKey: "MER-301", to: "doing" })
      )) as unknown as StubResponse

      expect(response.status).toBe(200)
      expect(mocks.moveSprintLabTicket).toHaveBeenCalledTimes(1)
    })
  })
})
