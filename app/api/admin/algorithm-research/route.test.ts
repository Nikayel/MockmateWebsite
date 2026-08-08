/**
 * Tests for the end-ab-switch-fsrs admin action.
 *
 * Pins the lifecycle rules that make the switch safe:
 * - permission-gated (403 without MANAGE_SETTINGS, no migration side effects)
 * - dry runs never finalize
 * - finalization (markAbTestEnded) happens only on the LAST non-dry page
 * - every page is audit-logged with counts
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import type { NextRequest } from "next/server"

/** Every `.set()` the route performs, so a test can assert where data landed. */
type WriteRecord = { path: string; data: Record<string, unknown> }

const h = vi.hoisted(() => {
  const writes: WriteRecord[] = []

  // Fixture: one SM-2 user with sessions, one FSRS user with mastery rows, and
  // one user the experiment never randomized.
  const profiles = [
    {
      id: "u-sm2",
      data: { spaced_repetition_algorithm: "sm2", streak_days: 3, longest_streak_days: 5 },
    },
    { id: "u-fsrs", data: { spaced_repetition_algorithm: "fsrs" } },
    { id: "u-none", data: { email: "never@randomized.test" } },
  ]
  const sessionsByUser: Record<string, Array<Record<string, unknown>>> = {
    "u-sm2": [
      { performanceScore: 80, durationMinutes: 20, completedAt: "2026-08-01T10:00:00.000Z" },
      { performanceScore: 40, durationMinutes: 10, completedAt: "2026-08-02T10:00:00.000Z" },
    ],
    "u-fsrs": [],
    "u-none": [
      { performanceScore: 90, durationMinutes: 5, completedAt: "2026-08-03T10:00:00.000Z" },
    ],
  }
  const masteryByUser: Record<string, Array<Record<string, unknown>>> = {
    "u-sm2": [{ review_count: 4, interval_days: 6, mastery_level: "learning" }],
    "u-fsrs": [{ review_count: 2, interval_days: 30, mastery_level: "mastered" }],
    "u-none": [],
  }

  const snapshotOf = (docs: Array<{ id: string; data: Record<string, unknown> }>) => ({
    docs: docs.map((doc) => ({ id: doc.id, data: () => doc.data, ref: { path: doc.id } })),
    size: docs.length,
    empty: docs.length === 0,
  })

  const queryStub = (docs: Array<{ id: string; data: Record<string, unknown> }>) => {
    const query: Record<string, unknown> = {
      get: () => Promise.resolve(snapshotOf(docs)),
    }
    query.orderBy = () => query
    query.limit = () => query
    query.where = () => query
    return query
  }

  const listAsDocs = (rows: Array<Record<string, unknown>>) =>
    rows.map((row, index) => ({ id: `${index}`, data: row }))

  const docStub = (path: string, userId: string) => ({
    get: () =>
      Promise.resolve({
        // user_stats is treated as absent so the rebuild branch is exercised.
        exists: false,
        data: () => null,
      }),
    set: (data: Record<string, unknown>) => {
      writes.push({ path, data })
      return Promise.resolve()
    },
    collection: (sub: string) =>
      queryStub(
        sub === "problems"
          ? listAsDocs(masteryByUser[userId] ?? [])
          : listAsDocs(sessionsByUser[userId] ?? [])
      ),
  })

  const adminDb = {
    collection: (name: string) => {
      if (name === "profiles") return queryStub(profiles)
      return {
        ...queryStub([]),
        doc: (id: string) => docStub(`${name}/${id}`, id),
      }
    },
  }

  return {
    requirePermission: vi.fn(),
    migrateAllUsersToFsrs: vi.fn(),
    markAbTestEnded: vi.fn(() => Promise.resolve()),
    logAdminAction: vi.fn(() => Promise.resolve()),
    getExperimentRegistry: vi.fn(),
    recordSweepPage: vi.fn(() => Promise.resolve(null)),
    recordSweepFailure: vi.fn(() => Promise.resolve()),
    reopenAbTest: vi.fn(() =>
      Promise.resolve({ reopenedAt: "2026-08-08T00:00:00.000Z", previousStatus: "ended" })
    ),
    adminDb,
    writes,
  }
})

vi.mock("@/lib/firebase-admin", () => ({ adminDb: h.adminDb }))
vi.mock("@/lib/admin/middleware", () => ({ requirePermission: h.requirePermission }))
vi.mock("@/lib/admin/rbac", () => ({
  PERMISSIONS: { VIEW_ANALYTICS: "view_analytics", MANAGE_SETTINGS: "manage_settings" },
}))
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
vi.mock("@/lib/research/experiment-registry", () => ({
  getExperimentRegistry: h.getExperimentRegistry,
  recordSweepPage: h.recordSweepPage,
  recordSweepFailure: h.recordSweepFailure,
  reopenAbTest: h.reopenAbTest,
}))

const registryState = (sweep: Record<string, unknown> = {}) => ({
  experimentId: "sm2-vs-fsrs-v1",
  status: "running",
  startedAt: null,
  endedAt: null,
  endedBy: null,
  rolledBackAt: null,
  rolledBackBy: null,
  rollbackReason: null,
  design: {
    primaryMetric: "retention",
    alpha: 0.05,
    targetEffectSize: 0.3,
    minUsersPerArm: 30,
    stoppingRule: "Fixed horizon.",
  },
  sweep: {
    inProgress: false,
    cursor: null,
    pagesCompleted: 0,
    usersFlipped: 0,
    cardsConverted: 0,
    startedAt: null,
    updatedAt: null,
    lastError: null,
    ...sweep,
  },
  updatedAt: null,
})

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
  h.requirePermission.mockReset()
  h.migrateAllUsersToFsrs.mockReset()
  h.markAbTestEnded.mockClear()
  h.logAdminAction.mockClear()
  h.requirePermission.mockResolvedValue({
    authorized: true,
    context: { userId: "admin-1", email: "a@b.c", role: "super_admin", permissions: [] },
  })
  h.getExperimentRegistry.mockReset()
  h.getExperimentRegistry.mockResolvedValue(registryState())
  h.recordSweepPage.mockClear()
  h.recordSweepFailure.mockClear()
  h.reopenAbTest.mockClear()
})

describe("POST /api/admin/algorithm-research permission gate", () => {
  it("demands MANAGE_SETTINGS, not merely an admin role", async () => {
    h.migrateAllUsersToFsrs.mockResolvedValue(sweepResult())
    await POST(postRequest({ action: "end-ab-switch-fsrs" }))
    expect(h.requirePermission).toHaveBeenCalledWith(expect.anything(), "manage_settings")
  })

  it.each(["end-ab-switch-fsrs", "backfill-research", "migrate", "regenerate"])(
    "refuses %s for a role without MANAGE_SETTINGS",
    async (action) => {
      // What an `analyst` or `support` admin gets back from requirePermission.
      h.requirePermission.mockResolvedValue({
        authorized: false,
        error: "Access denied - missing permission: manage_settings",
        status: 403,
      })

      const res = await POST(postRequest({ action }))

      expect(res.status).toBe(403)
      expect(h.migrateAllUsersToFsrs).not.toHaveBeenCalled()
      expect(h.markAbTestEnded).not.toHaveBeenCalled()
      expect(h.logAdminAction).not.toHaveBeenCalled()
    }
  )
})

describe("POST /api/admin/algorithm-research end-ab-switch-fsrs", () => {
  it("returns 403 and performs no migration when not authorized", async () => {
    h.requirePermission.mockResolvedValue({ authorized: false, error: "nope", status: 403 })

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

describe("POST /api/admin/algorithm-research backfill-research", () => {
  const backfill = (body: Record<string, unknown> = {}) =>
    POST(postRequest({ action: "backfill-research", ...body }))

  const writesTo = (collection: string) =>
    h.writes.filter((write) => write.path.startsWith(`${collection}/`))

  beforeEach(() => {
    h.writes.length = 0
  })

  it("defaults to a dry run and writes nothing", async () => {
    const res = asStub(await backfill())

    expect(res.status).toBe(200)
    expect(h.writes).toHaveLength(0)
    expect(res.data.message).toContain("Dry run")
    expect(res.data.data?.dryRun).toBe(true)
    expect(res.data.data?.backfillDocsWritten).toBe(0)
  })

  it("refuses a live run without the typed confirmation", async () => {
    const res = asStub(await backfill({ dryRun: false }))

    expect(res.status).toBe(400)
    expect(h.writes).toHaveLength(0)
  })

  it("refuses a live run with the wrong confirmation", async () => {
    const res = asStub(await backfill({ dryRun: false, confirm: "yes" }))

    expect(res.status).toBe(400)
    expect(h.writes).toHaveLength(0)
  })

  it("never writes into the live A/B cohort collections", async () => {
    await backfill({ dryRun: false, confirm: "BACKFILL" })

    // The old implementation wrote to algorithm_research_metrics/{uid}/summary,
    // which generateAggregateComparison() reads via collectionGroup("summary").
    expect(writesTo("algorithm_research_metrics")).toHaveLength(0)
    expect(h.writes.some((write) => write.path.includes("/summary"))).toBe(false)
    expect(writesTo("algorithm_research_backfill").length).toBeGreaterThan(0)
  })

  it("skips users with no algorithm assignment instead of filing them under SM-2", async () => {
    const res = asStub(await backfill({ dryRun: false, confirm: "BACKFILL" }))

    expect(res.data.data?.usersSkippedUnassigned).toBe(1)
    const derived = writesTo("algorithm_research_backfill")
    expect(derived.map((write) => write.path)).not.toContain("algorithm_research_backfill/u-none")
    expect(derived.every((write) => write.data.algorithm !== undefined)).toBe(true)
  })

  it("tags derived rows with their provenance and leaves unmeasurable fields null", async () => {
    await backfill({ dryRun: false, confirm: "BACKFILL" })

    const row = writesTo("algorithm_research_backfill").find(
      (write) => write.path === "algorithm_research_backfill/u-sm2"
    )!
    expect(row.data.data_source).toBe("backfill_derived")
    expect(row.data.estimated_fields).toContain("average_interval_accuracy")
    expect(row.data.average_time_to_mastery_days).toBeNull()
    // 80 and 40 -> mean 60, one of two sessions at or above the 56 threshold.
    expect(row.data.lifetime_average_score).toBe(60)
    expect(row.data.lifetime_retention_rate).toBe(50)
  })

  it("audits both dry runs and live runs", async () => {
    await backfill()
    await backfill({ dryRun: false, confirm: "BACKFILL" })

    expect(h.logAdminAction).toHaveBeenCalledTimes(2)
    const [, action, details] = h.logAdminAction.mock.calls[1] as unknown as [
      unknown,
      string,
      Record<string, unknown>,
    ]
    expect(action).toBe("backfill_research_data")
    expect(details).toMatchObject({
      dryRun: false,
      destination: "algorithm_research_backfill",
      usersSkippedUnassigned: 1,
    })
  })
})

describe("sweep lifecycle: resume and rollback", () => {
  it("resumes from the stored cursor when the client sends none", async () => {
    // A tab closed mid-sweep: ab_ended is still false and the browser's cursor
    // is gone, but the server remembers where the sweep stopped.
    h.getExperimentRegistry.mockResolvedValue(
      registryState({ inProgress: true, cursor: "u-500", pagesCompleted: 5 })
    )
    h.migrateAllUsersToFsrs.mockResolvedValue(sweepResult({ nextCursor: "u-600" }))

    await POST(postRequest({ action: "end-ab-switch-fsrs" }))

    expect(h.migrateAllUsersToFsrs).toHaveBeenCalledWith({
      dryRun: false,
      cursor: "u-500",
      maxUsers: 100,
    })
  })

  it("prefers an explicit cursor over the stored one", async () => {
    h.getExperimentRegistry.mockResolvedValue(registryState({ inProgress: true, cursor: "u-500" }))
    h.migrateAllUsersToFsrs.mockResolvedValue(sweepResult({ nextCursor: "u-900" }))

    await POST(postRequest({ action: "end-ab-switch-fsrs", cursor: "u-800" }))

    expect(h.migrateAllUsersToFsrs).toHaveBeenCalledWith({
      dryRun: false,
      cursor: "u-800",
      maxUsers: 100,
    })
  })

  it("never resumes a dry run from the live sweep cursor", async () => {
    h.getExperimentRegistry.mockResolvedValue(registryState({ inProgress: true, cursor: "u-500" }))
    h.migrateAllUsersToFsrs.mockResolvedValue(sweepResult({ dryRun: true, nextCursor: null }))

    await POST(postRequest({ action: "end-ab-switch-fsrs", dryRun: true }))

    expect(h.migrateAllUsersToFsrs).toHaveBeenCalledWith({
      dryRun: true,
      cursor: undefined,
      maxUsers: 100,
    })
  })

  it("records every live page so the sweep can be picked up again", async () => {
    h.migrateAllUsersToFsrs.mockResolvedValue(sweepResult({ nextCursor: "u-700" }))

    await POST(postRequest({ action: "end-ab-switch-fsrs" }))

    expect(h.recordSweepPage).toHaveBeenCalledWith("admin-1", {
      dryRun: false,
      nextCursor: "u-700",
      usersFlipped: 4,
      cardsConverted: 42,
      errorCount: 0,
    })
  })

  it("keeps the resume point when a page throws", async () => {
    h.migrateAllUsersToFsrs.mockRejectedValue(new Error("firestore deadline exceeded"))

    const res = await POST(postRequest({ action: "end-ab-switch-fsrs" }))

    expect(res.status).toBe(500)
    expect(h.recordSweepFailure).toHaveBeenCalledWith("firestore deadline exceeded")
  })

  it("reopens the A/B only with the confirmation and a reason", async () => {
    const noConfirm = await POST(postRequest({ action: "reopen-ab", reason: "ended too early" }))
    expect(noConfirm.status).toBe(400)

    const wrongToken = await POST(
      postRequest({ action: "reopen-ab", confirm: "yes", reason: "ended too early" })
    )
    expect(wrongToken.status).toBe(400)

    const noReason = await POST(postRequest({ action: "reopen-ab", confirm: "REOPEN" }))
    expect(noReason.status).toBe(400)
    expect(h.reopenAbTest).not.toHaveBeenCalled()

    const res = asStub(
      await POST(postRequest({ action: "reopen-ab", confirm: "REOPEN", reason: "ended too early" }))
    )
    expect(res.status).toBe(200)
    expect(h.reopenAbTest).toHaveBeenCalledWith("admin-1", "ended too early")
    expect(res.data.message).toContain("randomized again")
  })

  it("audits a rollback with its reason", async () => {
    await POST(postRequest({ action: "reopen-ab", confirm: "REOPEN", reason: "premature" }))

    const [, action, details] = h.logAdminAction.mock.calls[0] as unknown as [
      unknown,
      string,
      Record<string, unknown>,
    ]
    expect(action).toBe("reopen_ab_test")
    expect(details).toMatchObject({ reason: "premature", previousStatus: "ended" })
  })
})
