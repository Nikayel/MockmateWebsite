/**
 * Tests for the end-ab-switch-fsrs admin action.
 *
 * Pins the lifecycle rules that make the switch safe:
 * - admin-gated (403 without auth, no migration side effects)
 * - dry runs never finalize
 * - finalization (markAbTestEnded) happens only on the LAST non-dry page
 * - every page is audit-logged with counts
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import type { NextRequest } from "next/server"

const h = vi.hoisted(() => ({
  verifyAdminAccess: vi.fn(),
  migrateAllUsersToFsrs: vi.fn(),
  markAbTestEnded: vi.fn(() => Promise.resolve()),
  logAdminAction: vi.fn(() => Promise.resolve()),
}))

vi.mock("@/lib/firebase-admin", () => ({ adminDb: {} }))
vi.mock("@/lib/admin/middleware", () => ({ verifyAdminAccess: h.verifyAdminAccess }))
vi.mock("@/lib/admin/audit", () => ({
  logAdminAction: h.logAdminAction,
  AUDIT_ACTIONS: { END_AB_SWITCH_FSRS: "end_ab_switch_fsrs" },
}))
vi.mock("@/lib/spaced-repetition", () => ({
  getAlgorithmDistribution: vi.fn(),
  migrateExistingUsers: vi.fn(),
  getAggregateComparison: vi.fn(),
  generateAggregateComparison: vi.fn(),
  getRecentEvents: vi.fn(),
  getAlgorithmConfig: vi.fn(() => Promise.resolve({ ab_ended: false, default_algorithm: "fsrs" })),
  markAbTestEnded: h.markAbTestEnded,
}))
vi.mock("@/lib/spaced-repetition/fsrs-migration", () => ({
  migrateAllUsersToFsrs: h.migrateAllUsersToFsrs,
}))

import { POST } from "./route"

const sweepResult = (overrides: Record<string, unknown> = {}) => ({
  usersScanned: 10,
  usersFlippedToFsrs: 4,
  usersAlreadyFsrs: 5,
  usersOverriddenSkipped: 1,
  cardsConverted: 42,
  cardsSkipped: 3,
  errors: [],
  nextCursor: null,
  dryRun: false,
  ...overrides,
})

// The global vitest setup stubs next/server: NextResponse.json returns a plain
// { data, status } object, so requests/responses follow the stub convention.
const postRequest = (body: Record<string, unknown>) =>
  ({
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  }) as unknown as NextRequest

type StubResponse = {
  status: number
  data: { success: boolean; message?: string; data?: Record<string, unknown> }
}

const asStub = (res: unknown) => res as unknown as StubResponse

beforeEach(() => {
  h.verifyAdminAccess.mockReset()
  h.migrateAllUsersToFsrs.mockReset()
  h.markAbTestEnded.mockClear()
  h.logAdminAction.mockClear()
  h.verifyAdminAccess.mockResolvedValue({
    authorized: true,
    context: { userId: "admin-1", email: "a@b.c", role: "super_admin", permissions: [] },
  })
})

describe("POST /api/admin/algorithm-research end-ab-switch-fsrs", () => {
  it("returns 403 and performs no migration when not admin", async () => {
    h.verifyAdminAccess.mockResolvedValue({ authorized: false, error: "nope", status: 403 })

    const res = await POST(postRequest({ action: "end-ab-switch-fsrs" }))

    expect(res.status).toBe(403)
    expect(h.migrateAllUsersToFsrs).not.toHaveBeenCalled()
    expect(h.markAbTestEnded).not.toHaveBeenCalled()
  })

  it("rejects invalid bodies with 400", async () => {
    const res = await POST(postRequest({ action: "end-ab-switch-fsrs", dryRun: "yes" }))
    expect(res.status).toBe(400)
    expect(h.migrateAllUsersToFsrs).not.toHaveBeenCalled()
  })

  it("dry run passes through and never finalizes", async () => {
    h.migrateAllUsersToFsrs.mockResolvedValue(sweepResult({ dryRun: true }))

    const res = asStub(await POST(postRequest({ action: "end-ab-switch-fsrs", dryRun: true })))

    expect(res.status).toBe(200)
    expect(h.migrateAllUsersToFsrs).toHaveBeenCalledWith({
      dryRun: true,
      cursor: undefined,
      maxUsers: 100,
    })
    expect(h.markAbTestEnded).not.toHaveBeenCalled()
    expect(res.data.message).toContain("Dry run")
    expect(res.data.data?.usersFlippedToFsrs).toBe(4)
  })

  it("does not finalize a non-dry page with a nextCursor", async () => {
    h.migrateAllUsersToFsrs.mockResolvedValue(sweepResult({ nextCursor: "u100" }))

    const res = asStub(await POST(postRequest({ action: "end-ab-switch-fsrs", cursor: "u050" })))

    expect(h.migrateAllUsersToFsrs).toHaveBeenCalledWith({
      dryRun: false,
      cursor: "u050",
      maxUsers: 100,
    })
    expect(h.markAbTestEnded).not.toHaveBeenCalled()
    expect(res.data.message).toContain("Continue with cursor")
    expect(res.data.data?.nextCursor).toBe("u100")
  })

  it("finalizes via markAbTestEnded on the last non-dry page", async () => {
    h.migrateAllUsersToFsrs.mockResolvedValue(sweepResult({ nextCursor: null }))

    const res = asStub(await POST(postRequest({ action: "end-ab-switch-fsrs" })))

    expect(h.markAbTestEnded).toHaveBeenCalledWith("admin-1")
    expect(res.data.message).toContain("A/B ended")
    expect(res.data.message).toContain("kept their choice")
  })

  it("audit-logs every page with counts (dry runs included)", async () => {
    h.migrateAllUsersToFsrs.mockResolvedValue(sweepResult({ dryRun: true }))
    await POST(postRequest({ action: "end-ab-switch-fsrs", dryRun: true }))

    expect(h.logAdminAction).toHaveBeenCalledTimes(1)
    const [adminId, action, details] = h.logAdminAction.mock.calls[0] as unknown as [
      string,
      string,
      Record<string, unknown>,
    ]
    expect(adminId).toBe("admin-1")
    expect(action).toBe("end_ab_switch_fsrs")
    expect(details).toMatchObject({
      dryRun: true,
      finalized: false,
      usersFlippedToFsrs: 4,
      cardsConverted: 42,
      errorCount: 0,
    })
  })

  it("leaves legacy actions untouched (unknown action still 400s)", async () => {
    const res = await POST(postRequest({ action: "bogus" }))
    expect(res.status).toBe(400)
  })
})
