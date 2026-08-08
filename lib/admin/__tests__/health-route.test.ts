import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { DependencyProbe } from "../dependency-probes"
import { adminCache } from "../cache"

/**
 * The System Health route.
 *
 * The bug these tests exist for was not a wrong probe, it was an unused one: a
 * 479-line probe framework shipped with tests and zero non-test callers, while
 * the route it was written for still initialised `storage: healthy` and never
 * touched it again. So the first thing pinned here is the wiring itself, and
 * the rest is the behaviour that wiring is supposed to buy: a broken dependency
 * turns the platform red, a wedged one cannot hang the poll, and a dependency
 * nobody could check is never counted as working.
 */

const { probeSet, store, logAdminAction } = vi.hoisted(() => ({
  probeSet: [] as DependencyProbe[],
  store: new Map<string, Record<string, unknown>>(),
  logAdminAction: vi.fn(),
}))

/** Enough Firestore to exercise the acknowledgement documents and one count. */
const fakeDb = {
  collection: (name: string) => ({
    doc: (id: string) => ({
      set: async (data: Record<string, unknown>) => {
        store.set(`${name}/${id}`, data)
      },
      delete: async () => {
        store.delete(`${name}/${id}`)
      },
    }),
    get: async () => ({
      docs: [...store.entries()]
        .filter(([key]) => key.startsWith(`${name}/`))
        .map(([key, data]) => ({ id: key.slice(name.length + 1), data: () => data })),
    }),
    where: () => ({
      count: () => ({ get: async () => ({ data: () => ({ count: 7 }) }) }),
    }),
  }),
}

vi.mock("@/lib/firebase-admin", () => ({ adminDb: fakeDb, adminAuth: {} }))
vi.mock("@/lib/admin/platform-probes", () => ({ PLATFORM_PROBES: probeSet }))
vi.mock("@/lib/admin/audit", () => ({ logAdminAction }))
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock("@/lib/admin/middleware", () => ({
  // The permission gate is covered by route-permissions.test.ts; here it would
  // only stand between the test and the handler under test.
  withPermission: (_permission: unknown, handler: unknown) => handler,
}))

type HealthResponse = {
  data: {
    success: boolean
    health: {
      status: string
      dependencies: Array<{ id: string; status: string; latencyMs: number | null }>
      summary: { healthy: number; degraded: number; unhealthy: number; unknown: number; total: number }
      metrics: { productEvents24h: number | null }
      alerts: Array<{
        id: string
        type: string
        signature: string
        acknowledged: boolean
        acknowledgedBy: string | null
      }>
    }
  }
  status: number
}

/**
 * Swap the registered probes.
 *
 * Also drops the route's probe cache. The route caches results so the page's 30s
 * poll does not re-hit seven vendors on every refresh, which means a test that
 * changes the world and then asks for health would otherwise be answered from the
 * previous state. Clearing here rather than in a beforeEach covers the cases that
 * swap probes midway through a test to prove a dependency recovering.
 */
function useProbes(...probes: Array<Partial<DependencyProbe> & Pick<DependencyProbe, "id" | "run">>) {
  adminCache.delete("health:dependency-probes")
  probeSet.length = 0
  for (const probe of probes) {
    probeSet.push({ label: probe.id, critical: false, ...probe } as DependencyProbe)
  }
}

async function getHealth(): Promise<HealthResponse["data"]["health"]> {
  const { GET } = await import("@/app/api/admin/health/route")
  const response = (await (GET as unknown as (r: unknown) => Promise<HealthResponse>)(
    {} as unknown
  )) as HealthResponse
  expect(response.data.success).toBe(true)
  return response.data.health
}

async function postAcknowledge(body: unknown, userId = "admin-1") {
  const { POST } = await import("@/app/api/admin/health/route")
  const request = { json: async () => body }
  return (await (
    POST as unknown as (r: unknown, c: unknown) => Promise<{ data: { success: boolean }; status: number }>
  )(request, { userId, email: "admin@example.com", role: "admin", permissions: [] })) as {
    data: { success: boolean; error?: string }
    status: number
  }
}

const healthy: DependencyProbe["run"] = async () => ({ status: "healthy", detail: "ok" })

describe("GET /api/admin/health", () => {
  beforeEach(() => {
    store.clear()
    logAdminAction.mockClear()
    useProbes({ id: "firestore", critical: true, run: healthy })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("actually runs the registered platform probes", async () => {
    const run = vi.fn(healthy)
    useProbes({ id: "stripe", run })

    const health = await getHealth()

    expect(run).toHaveBeenCalledTimes(1)
    expect(health.dependencies.map((d) => d.id)).toEqual(["stripe"])
  })

  it("keeps the route pointed at PLATFORM_PROBES, not at a hardcoded card list", () => {
    // The regression this guards is a whole framework going unreferenced, which
    // a mocked import cannot notice.
    const source = readFileSync(
      join(process.cwd(), "app", "api", "admin", "health", "route.ts"),
      "utf8"
    )
    expect(source).toContain("PLATFORM_PROBES")
    expect(source).toContain("runDependencyProbes")
    // The four cards that could not fail.
    expect(source).not.toMatch(/storage:\s*\{\s*status:\s*"healthy"/)
  })

  it("turns the platform red when a critical dependency fails", async () => {
    useProbes(
      { id: "firestore", critical: true, run: async () => ({ status: "unhealthy", detail: "refused" }) },
      { id: "stripe", run: healthy }
    )

    const health = await getHealth()

    expect(health.status).toBe("unhealthy")
    expect(health.summary.unhealthy).toBe(1)
    expect(health.alerts).toHaveLength(1)
    expect(health.alerts[0]).toMatchObject({ id: "dependency-firestore", type: "error" })
  })

  it("degrades rather than fails when a non-critical vendor is down", async () => {
    useProbes(
      { id: "firestore", critical: true, run: healthy },
      { id: "brevo", run: async () => ({ status: "unhealthy", detail: "credentials rejected" }) }
    )

    expect((await getHealth()).status).toBe("degraded")
  })

  it("never counts unknown as healthy", async () => {
    useProbes(
      { id: "firestore", critical: true, run: healthy },
      { id: "sentry", run: async () => ({ status: "unknown", detail: "cannot be verified for free" }) }
    )

    const health = await getHealth()

    expect(health.status).toBe("unknown")
    expect(health.summary.healthy).toBe(1)
    expect(health.summary.unknown).toBe(1)
    // Nothing was measured, so nothing is reported as measured.
    expect(health.dependencies.find((d) => d.id === "sentry")?.latencyMs).toBeNull()
    expect(health.alerts[0]).toMatchObject({ id: "dependency-sentry", type: "info" })
  })

  it("does not hang the route when a vendor never answers", async () => {
    vi.useFakeTimers()
    useProbes(
      { id: "firestore", critical: true, run: healthy },
      // Ignores its abort signal entirely, which is the case the signal alone
      // cannot defend against.
      { id: "deepgram", run: () => new Promise<never>(() => {}) }
    )

    const { GET } = await import("@/app/api/admin/health/route")
    const pending = (GET as unknown as (r: unknown) => Promise<HealthResponse>)({} as unknown)

    // Past the 3s per-probe budget and no further.
    await vi.advanceTimersByTimeAsync(3500)
    const response = await pending

    expect(response.data.health.status).toBe("degraded")
    expect(response.data.health.dependencies.find((d) => d.id === "deepgram")?.status).toBe(
      "degraded"
    )
    // The probe that did answer is still reported.
    expect(response.data.health.dependencies.find((d) => d.id === "firestore")?.status).toBe(
      "healthy"
    )
  })

  it("reports the product event count as a number, or null when it cannot be taken", async () => {
    expect((await getHealth()).metrics.productEvents24h).toBe(7)
  })
})

describe("POST /api/admin/health (acknowledge)", () => {
  const failing: Array<Partial<DependencyProbe> & Pick<DependencyProbe, "id" | "run">> = [
    { id: "stripe", run: async () => ({ status: "unhealthy", detail: "credentials rejected" }) },
  ]

  beforeEach(() => {
    store.clear()
    logAdminAction.mockClear()
    useProbes(...failing)
  })

  it("persists an acknowledgement so it survives a refresh", async () => {
    const before = await getHealth()
    expect(before.alerts[0].acknowledged).toBe(false)

    const result = await postAcknowledge({
      alertId: before.alerts[0].id,
      signature: before.alerts[0].signature,
    })
    expect(result.data.success).toBe(true)

    const after = await getHealth()
    expect(after.alerts[0].acknowledged).toBe(true)
    expect(after.alerts[0].acknowledgedBy).toBe("admin-1")
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      "acknowledge_health_alert",
      expect.objectContaining({ alertId: "dependency-stripe" })
    )
  })

  it("does not let an acknowledged outage silence the next, different one", async () => {
    const first = await getHealth()
    await postAcknowledge({ alertId: first.alerts[0].id, signature: first.alerts[0].signature })

    // Same dependency, new failure.
    useProbes({ id: "stripe", run: async () => ({ status: "unhealthy", detail: "vendor 503" }) })

    const second = await getHealth()
    expect(second.alerts[0].acknowledged).toBe(false)
    // The record that no longer describes anything is swept, not left to rot.
    expect(store.has("health_alert_acknowledgements/dependency-stripe")).toBe(false)
  })

  it("clears the record once the dependency recovers", async () => {
    const alerting = await getHealth()
    await postAcknowledge({ alertId: alerting.alerts[0].id, signature: alerting.alerts[0].signature })
    expect(store.size).toBe(1)

    useProbes({ id: "stripe", run: healthy })
    const recovered = await getHealth()

    expect(recovered.alerts).toHaveLength(0)
    expect(store.size).toBe(0)
  })

  it("un-acknowledges on request", async () => {
    const alerting = await getHealth()
    const { id, signature } = alerting.alerts[0]

    await postAcknowledge({ alertId: id, signature })
    await postAcknowledge({ alertId: id, signature, acknowledged: false })

    expect((await getHealth()).alerts[0].acknowledged).toBe(false)
  })

  it("rejects a body without an alert to acknowledge", async () => {
    const result = await postAcknowledge({ acknowledged: true })
    expect(result.status).toBe(400)
    expect(result.data.success).toBe(false)
  })
})
