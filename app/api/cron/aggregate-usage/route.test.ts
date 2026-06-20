import { afterEach, describe, expect, it, vi } from "vitest"

const aggregateCostAverages = vi.fn()

async function importRoute(cronSecret?: string) {
  vi.resetModules()
  vi.unstubAllEnvs()
  if (cronSecret) {
    vi.stubEnv("CRON_SECRET", cronSecret)
  }

  aggregateCostAverages.mockReset()
  aggregateCostAverages.mockResolvedValue({
    averageHourlyCost: 2,
    totalCost: 336,
    eventCount: 10,
    windowHours: 168,
    calculatedAt: "2026-01-08T00:00:00.000Z",
  })

  vi.doMock("@/lib/cost-anomaly-detection", () => ({
    aggregateCostAverages,
  }))
  vi.doMock("@/lib/logger", () => ({
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
  }))

  return import("./route")
}

describe("/api/cron/aggregate-usage", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("rejects requests without the cron secret", async () => {
    const { POST } = await importRoute("secret")
    const response = await POST(new Request("http://localhost/api/cron/aggregate-usage") as any)

    expect(response.status).toBe(401)
    expect(aggregateCostAverages).not.toHaveBeenCalled()
  })

  it("runs aggregation for authorized requests", async () => {
    const { POST } = await importRoute("secret")
    const response = await POST(
      new Request("http://localhost/api/cron/aggregate-usage", {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
        },
      }) as any
    )

    expect(response.status).toBe(200)
    expect((response as any).data.success).toBe(true)
    expect((response as any).data.data.averageHourlyCost).toBe(2)
    expect(aggregateCostAverages).toHaveBeenCalledTimes(1)
  })

  it("returns a server error when CRON_SECRET is missing", async () => {
    const { POST } = await importRoute()
    const response = await POST(new Request("http://localhost/api/cron/aggregate-usage") as any)

    expect(response.status).toBe(500)
    expect(aggregateCostAverages).not.toHaveBeenCalled()
  })
})
