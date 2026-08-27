/**
 * Route-level tests for POST /api/sprint-labs/runs/provision, mirroring
 * app/api/sprint-labs/runs/files/route.test.ts's pattern: mock every module the route imports
 * except the pieces that are pure and safe to run for real (`sprintLabRunErrorStatus`,
 * `provisioningErrorStatus`, and the real `requireTierForSprint` from
 * `@/lib/sprint-labs/route-guards`, whose only dependency -- `requireTierForUser` -- is mocked
 * here), so the actual gating threshold and error-status mapping are exercised, not just trusted.
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
  seedWorkspaceFilesIfAbsent: vi.fn(),
  materializeInitialTree: vi.fn(),
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
    seedWorkspaceFilesIfAbsent: mocks.seedWorkspaceFilesIfAbsent,
  }
})

vi.mock("@/lib/sprint-labs/provisioning/materialize-initial-tree", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/sprint-labs/provisioning/materialize-initial-tree")
  >("@/lib/sprint-labs/provisioning/materialize-initial-tree")
  return {
    ...actual,
    materializeInitialTree: mocks.materializeInitialTree,
  }
})

function createRequest(body: unknown): NextRequest {
  return {
    headers: { get: (name: string) => (name === "Authorization" ? "Bearer valid-token" : null) },
    json: () => Promise.resolve(body),
  } as unknown as NextRequest
}

type StubResponse = { status: number }

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

const SAMPLE_FILES = [
  { path: "src/a.ts", content: "export const a = 1", role: "editable" },
  { path: "MERIDIAN.md", content: "# Meridian", role: "docs" },
  { path: "tests/visible/a.test.ts", content: "it('x', () => {})", role: "test" },
]

describe("POST /api/sprint-labs/runs/provision", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiRateLimit.mockResolvedValue(null)
    mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: USER })
    mocks.getFlagAsync.mockResolvedValue(true)
    mocks.requireTierForUser.mockResolvedValue({ allowed: true })
    mocks.seedWorkspaceFilesIfAbsent.mockResolvedValue([])
  })

  it("returns 401 when unauthenticated", async () => {
    mocks.verifyAuth.mockResolvedValue({ authenticated: false })
    const { POST } = await import("./route")

    const response = (await POST(
      createRequest({ runId: "run1", ticketKey: "MER-101" })
    )) as unknown as StubResponse

    expect(response.status).toBe(401)
    expect(mocks.materializeInitialTree).not.toHaveBeenCalled()
  })

  it("returns 404 when the Sprint Labs flag is off (not-yet-launched surface reads as absent)", async () => {
    mocks.getFlagAsync.mockResolvedValue(false)
    const { POST } = await import("./route")

    const response = (await POST(
      createRequest({ runId: "run1", ticketKey: "MER-101" })
    )) as unknown as StubResponse

    expect(response.status).toBe(404)
    expect(mocks.materializeInitialTree).not.toHaveBeenCalled()
  })

  it("returns 400 for a malformed body", async () => {
    const { POST } = await import("./route")

    const response = (await POST(createRequest({ runId: "run1" }))) as unknown as StubResponse

    expect(response.status).toBe(400)
    expect(mocks.materializeInitialTree).not.toHaveBeenCalled()
  })

  it("returns 404 when the run does not exist or is not owned by the caller", async () => {
    mocks.getSprintLabRun.mockResolvedValue(null)
    const { POST } = await import("./route")

    const response = (await POST(
      createRequest({ runId: "run1", ticketKey: "MER-101" })
    )) as unknown as StubResponse

    expect(response.status).toBe(404)
    expect(mocks.materializeInitialTree).not.toHaveBeenCalled()
  })

  it("REJECTS a free user provisioning into a run already at sprint 2 (tier gate fires before materialization)", async () => {
    mocks.getSprintLabRun.mockResolvedValue(baseRun({ currentSprint: 2 }))
    mocks.requireTierForUser.mockResolvedValue({
      allowed: false,
      response: { status: 403, data: { error: "Pro feature required" } },
    })
    const { POST } = await import("./route")

    const response = (await POST(
      createRequest({ runId: "run1", ticketKey: "MER-201" })
    )) as unknown as StubResponse

    expect(response.status).toBe(403)
    expect(mocks.materializeInitialTree).not.toHaveBeenCalled()
    expect(mocks.seedWorkspaceFilesIfAbsent).not.toHaveBeenCalled()
  })

  it("ALLOWS a free user on a sprint-1 run: materializes, seeds only the editable role", async () => {
    mocks.getSprintLabRun.mockResolvedValue(baseRun({ currentSprint: 1 }))
    mocks.materializeInitialTree.mockReturnValue(SAMPLE_FILES)
    const { POST } = await import("./route")

    const response = (await POST(
      createRequest({ runId: "run1", ticketKey: "MER-101" })
    )) as unknown as StubResponse

    expect(response.status).toBe(200)
    expect(mocks.requireTierForUser).not.toHaveBeenCalled()
    // workbookId comes off the OWNED run, never off the request body.
    expect(mocks.materializeInitialTree).toHaveBeenCalledWith("meridian", "MER-101")
    expect(mocks.seedWorkspaceFilesIfAbsent).toHaveBeenCalledTimes(1)
    expect(mocks.seedWorkspaceFilesIfAbsent).toHaveBeenCalledWith(USER, "run1", [SAMPLE_FILES[0]])
  })

  it("maps a materialization UNKNOWN_TICKET error to 404 without seeding", async () => {
    mocks.getSprintLabRun.mockResolvedValue(baseRun({ currentSprint: 1 }))
    mocks.materializeInitialTree.mockImplementation(() => {
      throw new Error("UNKNOWN_TICKET")
    })
    const { POST } = await import("./route")

    const response = (await POST(
      createRequest({ runId: "run1", ticketKey: "NOPE-1" })
    )) as unknown as StubResponse

    expect(response.status).toBe(404)
    expect(mocks.seedWorkspaceFilesIfAbsent).not.toHaveBeenCalled()
  })

  it("maps an unrecognized materialization failure to a logged 500, not a raw internal error", async () => {
    mocks.getSprintLabRun.mockResolvedValue(baseRun({ currentSprint: 1 }))
    mocks.materializeInitialTree.mockImplementation(() => {
      throw new Error("MATERIALIZE_FAILED")
    })
    const { POST } = await import("./route")

    const response = (await POST(
      createRequest({ runId: "run1", ticketKey: "MER-101" })
    )) as unknown as StubResponse

    expect(response.status).toBe(500)
    expect(mocks.loggerError).toHaveBeenCalled()
  })
})
