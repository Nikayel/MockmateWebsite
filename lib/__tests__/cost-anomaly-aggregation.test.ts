import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

function createDoc(data: Record<string, unknown>) {
  return {
    data: () => data,
  }
}

async function importCostAnomalyDetection() {
  vi.resetModules()
  vi.doMock("firebase-admin/firestore", () => ({
    FieldValue: {
      serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
    },
  }))

  return import("../cost-anomaly-detection")
}

describe("cost anomaly aggregation", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-08T00:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("reads average hourly cost from config without querying usage events", async () => {
    const { adminDb } = await import("../firebase-admin")
    const collection = vi.mocked(adminDb.collection)

    collection.mockImplementation((name: string) => {
      if (name === "config") {
        return {
          doc: vi.fn(() => ({
            get: vi.fn(async () => ({
              exists: true,
              data: () => ({
                averageHourlyCost: 12.5,
                calculatedAt: "2026-01-08T00:00:00.000Z",
              }),
            })),
          })),
        }
      }
      throw new Error(`Unexpected collection: ${name}`)
    })

    const { getAverageHourlyCost } = await importCostAnomalyDetection()

    await expect(getAverageHourlyCost()).resolves.toBe(12.5)
    expect(collection).toHaveBeenCalledWith("config")
    expect(collection).not.toHaveBeenCalledWith("usage_events")
  })

  it("returns zero when the aggregate document is stale", async () => {
    const { adminDb } = await import("../firebase-admin")
    const collection = vi.mocked(adminDb.collection)

    collection.mockImplementation((name: string) => {
      if (name === "config") {
        return {
          doc: vi.fn(() => ({
            get: vi.fn(async () => ({
              exists: true,
              data: () => ({
                averageHourlyCost: 12.5,
                calculatedAt: "2026-01-07T00:00:00.000Z",
              }),
            })),
          })),
        }
      }
      throw new Error(`Unexpected collection: ${name}`)
    })

    const { getAverageHourlyCost } = await importCostAnomalyDetection()

    await expect(getAverageHourlyCost()).resolves.toBe(0)
    expect(collection).not.toHaveBeenCalledWith("usage_events")
  })

  it("aggregates usage events and writes config cost averages", async () => {
    const { adminDb } = await import("../firebase-admin")
    const collection = vi.mocked(adminDb.collection)
    const set = vi.fn()
    const where = vi.fn()
    const orderBy = vi.fn()
    const limit = vi.fn()
    const get = vi.fn(async () => ({
      size: 2,
      docs: [
        createDoc({ cost: 10, createdAt: { toDate: () => new Date("2026-01-08T00:00:00.000Z") } }),
        createDoc({ cost: 4, createdAt: { toDate: () => new Date("2026-01-07T00:00:00.000Z") } }),
      ],
    }))

    limit.mockReturnValue({ get })
    orderBy.mockReturnValue({ limit })
    where.mockReturnValue({ orderBy })

    collection.mockImplementation((name: string) => {
      if (name === "usage_events") {
        return { where }
      }
      if (name === "config") {
        return {
          doc: vi.fn(() => ({ set })),
        }
      }
      throw new Error(`Unexpected collection: ${name}`)
    })

    const { aggregateCostAverages } = await importCostAnomalyDetection()
    const result = await aggregateCostAverages(new Date("2026-01-08T00:00:00.000Z"))

    expect(result.totalCost).toBe(14)
    expect(result.eventCount).toBe(2)
    expect(result.averageHourlyCost).toBeCloseTo(14 / 168)
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        averageHourlyCost: result.averageHourlyCost,
        totalCost: 14,
        eventCount: 2,
        updatedAt: "SERVER_TIMESTAMP",
      }),
      { merge: true }
    )
  })
})
