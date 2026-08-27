/**
 * Route-level tests for PUT /api/sprint-labs/runs/files, covering what the
 * service layer cannot (the orchestration itself), same rationale and
 * pattern as app/api/sprint-labs/runs/route.test.ts:
 *
 *  - Round 3 follow-up 2: the file-save Pro gate (fix round 2, controller
 *    addition 3) shipped with NO regression test — mutation-testing the
 *    gate (deleting it) broke zero tests. This file closes that gap.
 *
 * Mocks every module the route imports except the pieces that are pure and
 * safe to run for real (`@/lib/sprint-labs/runs`'s schemas and
 * `sprintLabRunErrorStatus`, plus the real `requireTierForSprint` from
 * `@/lib/sprint-labs/route-guards`, whose only dependency —
 * `requireTierForUser` — is mocked here) so the actual gating threshold is
 * exercised, not just trusted.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifyAuth: vi.fn(),
  apiRateLimit: vi.fn(),
  getFlagAsync: vi.fn(),
  requireTierForUser: vi.fn(),
  loggerError: vi.fn(),
  getSprintLabRun: vi.fn(),
  listWorkspaceFiles: vi.fn(),
  saveWorkspaceFiles: vi.fn(),
}))

vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: mocks.verifyAuth }))
vi.mock("@/lib/rate-limit", () => ({ apiRateLimit: mocks.apiRateLimit }))
vi.mock("@/lib/feature-flags", () => ({ getFlagAsync: mocks.getFlagAsync }))
vi.mock("@/lib/quota-enforcement", () => ({ requireTierForUser: mocks.requireTierForUser }))
vi.mock("@/lib/logger", () => ({ logger: { error: mocks.loggerError } }))

vi.mock("@/lib/sprint-labs/runs", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/sprint-labs/runs")>("@/lib/sprint-labs/runs")
  return {
    ...actual,
    getSprintLabRun: mocks.getSprintLabRun,
    listWorkspaceFiles: mocks.listWorkspaceFiles,
    saveWorkspaceFiles: mocks.saveWorkspaceFiles,
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

describe("PUT /api/sprint-labs/runs/files", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiRateLimit.mockResolvedValue(null)
    mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: USER })
    mocks.getFlagAsync.mockResolvedValue(true)
    // Default to "allowed" so tests that don't care about the tier gate
    // don't need to configure it; the sprint-3-free-user test overrides this.
    mocks.requireTierForUser.mockResolvedValue({ allowed: true })
  })

  it("REJECTS a free user's save into a run already at sprint 3", async () => {
    mocks.getSprintLabRun.mockResolvedValue(baseRun({ currentSprint: 3 }))
    mocks.requireTierForUser.mockResolvedValue({
      allowed: false,
      response: { status: 403, data: { error: "Pro feature required" } },
    })
    const { PUT } = await import("./route")

    const response = (await PUT(
      createRequest({ runId: "run1", files: [{ path: "src/a.ts", content: "x" }] })
    )) as unknown as StubResponse

    expect(response.status).toBe(403)
    expect(mocks.saveWorkspaceFiles).not.toHaveBeenCalled()
  })

  it("ALLOWS a free user's save into a sprint-1 run (no tier check triggered)", async () => {
    mocks.getSprintLabRun.mockResolvedValue(baseRun({ currentSprint: 1 }))
    mocks.saveWorkspaceFiles.mockResolvedValue([
      { path: "src/a.ts", content: "x", updatedAt: "2026-01-01T00:00:00.000Z", revision: 1 },
    ])
    const { PUT } = await import("./route")

    const response = (await PUT(
      createRequest({ runId: "run1", files: [{ path: "src/a.ts", content: "x" }] })
    )) as unknown as StubResponse

    expect(response.status).toBe(200)
    expect(mocks.requireTierForUser).not.toHaveBeenCalled()
    expect(mocks.saveWorkspaceFiles).toHaveBeenCalledTimes(1)
  })

  it("ALLOWS a Pro user's save into a sprint-3 run", async () => {
    mocks.getSprintLabRun.mockResolvedValue(baseRun({ currentSprint: 3 }))
    mocks.requireTierForUser.mockResolvedValue({ allowed: true })
    mocks.saveWorkspaceFiles.mockResolvedValue([
      { path: "src/a.ts", content: "x", updatedAt: "2026-01-01T00:00:00.000Z", revision: 1 },
    ])
    const { PUT } = await import("./route")

    const response = (await PUT(
      createRequest({ runId: "run1", files: [{ path: "src/a.ts", content: "x" }] })
    )) as unknown as StubResponse

    expect(response.status).toBe(200)
    expect(mocks.saveWorkspaceFiles).toHaveBeenCalledTimes(1)
  })

  it("maps a pre-check read failure through serviceErrorResponse instead of escaping raw (round 3 follow-up 1)", async () => {
    mocks.getSprintLabRun.mockRejectedValue(new Error("UNAUTHORIZED"))
    const { PUT } = await import("./route")

    const response = (await PUT(
      createRequest({ runId: "run1", files: [{ path: "src/a.ts", content: "x" }] })
    )) as unknown as StubResponse

    expect(response.status).toBe(403)
    expect(mocks.saveWorkspaceFiles).not.toHaveBeenCalled()
  })
})
