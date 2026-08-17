/**
 * The cost anomaly config is the comparison inside every alarm, and the admin
 * route used to write whatever JSON it was handed. `hourlyBudget: "banana"`
 * makes `rate > budget` false forever, which disarms the detector permanently
 * and silently; `hourlyBudget: null` makes it true for any spend at all, which
 * buries the real signal in noise. Neither is visible on the admin screen.
 *
 * So the rules are pinned on both sides of the document: refused on write, and
 * ignored on read for the values that predate the validation or arrive from a
 * console edit.
 *
 * Also here: the anomaly stats severity split, which incremented an absent key
 * for any unrecognized severity and rendered `NaN` as the admin panel's
 * critical count.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NextRequest } from "next/server"

type AnomalyRow = Record<string, unknown>

const mocks = vi.hoisted(() => ({
  state: {
    anomalyDocs: [] as AnomalyRow[],
  },
  configSet: vi.fn(async () => undefined),
  requirePermission: vi.fn(),
  logAdminAction: vi.fn(async () => undefined),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("../firebase-admin", () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => undefined }),
        set: mocks.configSet,
      }),
      orderBy: () => ({
        limit: () => ({
          get: async () => ({
            docs: mocks.state.anomalyDocs.map((data) => ({ data: () => data })),
            size: mocks.state.anomalyDocs.length,
          }),
        }),
      }),
    }),
  },
}))

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: vi.fn(() => "__ts") },
}))

vi.mock("../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: mocks.loggerWarn, error: mocks.loggerError },
}))

vi.mock("@/lib/admin/middleware", () => ({
  requirePermission: mocks.requirePermission,
  errorResponse: (error: string, status = 500) => ({ data: { success: false, error }, status }),
  unauthorizedResponse: (error: string, status = 403) => ({
    data: { success: false, error },
    status,
  }),
}))

vi.mock("@/lib/admin/rbac", () => ({
  PERMISSIONS: { MANAGE_BUDGETS: "manage_budgets", VIEW_AI_USAGE: "view_ai_usage" },
}))

vi.mock("@/lib/admin/audit", () => ({ logAdminAction: mocks.logAdminAction }))

/** The route's response, as the mocked NextResponse.json builds it. */
type RouteResponse = { data: { success: boolean; error?: string }; status: number }

function updateConfigRequest(config: unknown): NextRequest {
  return {
    url: "http://localhost/api/admin/cost-anomalies",
    headers: new Map(),
    json: async () => ({ action: "update_config", config }),
  } as unknown as NextRequest
}

async function postUpdateConfig(config: unknown): Promise<RouteResponse> {
  const { POST } = await import("@/app/api/admin/cost-anomalies/route")
  return (await POST(updateConfigRequest(config))) as unknown as RouteResponse
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  mocks.state.anomalyDocs = []
  mocks.requirePermission.mockResolvedValue({
    authorized: true,
    context: { userId: "admin-1" },
  })
})

describe("parseAnomalyConfigUpdate", () => {
  it("accepts positive finite numbers for the settable fields", async () => {
    const { parseAnomalyConfigUpdate } = await import("../cost-anomaly-detection")

    expect(parseAnomalyConfigUpdate({ hourlyBudget: 25, spikeMultiplier: 4 })).toEqual({
      ok: true,
      value: { hourlyBudget: 25, spikeMultiplier: 4 },
    })
  })

  it.each([
    ["a string", "banana"],
    ["null", null],
    ["zero", 0],
    ["a negative number", -5],
    ["NaN", NaN],
    ["Infinity", Infinity],
  ])("rejects %s and names the field", async (_label, value) => {
    const { parseAnomalyConfigUpdate } = await import("../cost-anomaly-detection")

    const result = parseAnomalyConfigUpdate({ hourlyBudget: value })

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error).toContain("hourlyBudget")
  })

  it("rejects a field no detector reads", async () => {
    // dailyBudget was settable, read by nothing, and defaulted to twice the
    // real ceiling. A knob that changes nothing is worse than no knob, because
    // the admin who turns it believes the platform changed.
    const { parseAnomalyConfigUpdate } = await import("../cost-anomaly-detection")

    const result = parseAnomalyConfigUpdate({ dailyBudget: 500 })

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error).toContain("dailyBudget")
  })

  it("rejects a patch that sets nothing", async () => {
    const { parseAnomalyConfigUpdate } = await import("../cost-anomaly-detection")

    expect(parseAnomalyConfigUpdate({}).ok).toBe(false)
    expect(parseAnomalyConfigUpdate(null).ok).toBe(false)
    expect(parseAnomalyConfigUpdate([]).ok).toBe(false)
    expect(parseAnomalyConfigUpdate("hourlyBudget=5").ok).toBe(false)
  })
})

describe("POST update_config", () => {
  it("refuses a non-numeric threshold with a 400 that names the field", async () => {
    const response = await postUpdateConfig({ hourlyBudget: "banana" })

    expect(response.status).toBe(400)
    expect(response.data.error).toContain("hourlyBudget")
    expect(mocks.configSet).not.toHaveBeenCalled()
    expect(mocks.logAdminAction).not.toHaveBeenCalled()
  })

  it("refuses a field nothing reads", async () => {
    const response = await postUpdateConfig({ dailyBudget: 500 })

    expect(response.status).toBe(400)
    expect(response.data.error).toContain("dailyBudget")
    expect(mocks.configSet).not.toHaveBeenCalled()
  })

  it("writes a valid patch and audits exactly what was written", async () => {
    const response = await postUpdateConfig({ hourlyBudget: 25 })

    expect(response.status).toBe(200)
    expect(mocks.configSet).toHaveBeenCalledWith(
      { hourlyBudget: 25, updatedAt: "__ts" },
      { merge: true }
    )
    expect(mocks.logAdminAction).toHaveBeenCalledWith("admin-1", "update_cost_anomaly_config", {
      config: { hourlyBudget: 25 },
    })
  })
})

describe("updateAnomalyConfig", () => {
  it("revalidates rather than trusting a caller that skipped the route", async () => {
    const { updateAnomalyConfig } = await import("../cost-anomaly-detection")

    await expect(
      updateAnomalyConfig({ hourlyBudget: "banana" } as unknown as { hourlyBudget: number })
    ).rejects.toThrow(/hourlyBudget/)
    expect(mocks.configSet).not.toHaveBeenCalled()
  })
})

describe("getAnomalyStats severity split", () => {
  it("counts only the severities it knows, instead of producing NaN", async () => {
    const timestamp = { toDate: () => new Date("2026-08-08T10:00:00Z") }
    mocks.state.anomalyDocs = [
      { severity: "warning", type: "hourly_spike", acknowledged: true, timestamp },
      { severity: "critical", type: "hourly_spike", acknowledged: false, timestamp },
      // A severity from a future version, and one from a document written
      // before the field existed. Both used to poison the whole split.
      { severity: "sideways", type: "hourly_spike", acknowledged: false, timestamp },
      { type: "user_cost_spike", acknowledged: false, timestamp },
    ]
    const { getAnomalyStats } = await import("../cost-anomaly-detection")

    const stats = await getAnomalyStats()

    expect(stats.bySeverity).toEqual({ warning: 1, critical: 1 })
    // The unrecognized rows are still counted; they just cannot corrupt the
    // number the infrastructure page renders as "critical".
    expect(stats.total).toBe(4)
    expect(stats.byType).toMatchObject({ hourly_spike: 3, user_cost_spike: 1 })
  })

  it("keeps estimated loss finite when cost or threshold is unusable", async () => {
    const timestamp = { toDate: () => new Date("2026-08-08T10:00:00Z") }
    mocks.state.anomalyDocs = [
      { severity: "critical", type: "hourly_spike", cost: 12, threshold: 5, timestamp },
      { severity: "critical", type: "hourly_spike", cost: NaN, threshold: 5, timestamp },
      { severity: "warning", type: "hourly_spike", cost: "banana", threshold: 5, timestamp },
    ]
    const { getAnomalyStats } = await import("../cost-anomaly-detection")

    const stats = await getAnomalyStats()

    expect(stats.estimatedLoss).toBe(7)
  })
})
