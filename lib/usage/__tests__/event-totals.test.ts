import { describe, it, expect } from "vitest"
import {
  readNumber,
  emptyUsageTotals,
  accumulateUsageEvent,
  sumUsageEvents,
  bucketUsageEvents,
  averageTokensPerRequest,
} from "../event-totals"

describe("readNumber", () => {
  it("passes finite numbers through, including zero and negatives", () => {
    expect(readNumber(4.5)).toBe(4.5)
    expect(readNumber(0)).toBe(0)
    expect(readNumber(-2)).toBe(-2)
  })

  it("treats every non-finite or non-numeric value as absent", () => {
    // The old `event.cost || 0` turned NaN into 0 quietly but ALSO propagated
    // it when written as `total += event.cost`, poisoning the whole sum.
    expect(readNumber(NaN)).toBe(0)
    expect(readNumber(Infinity)).toBe(0)
    expect(readNumber("1.50")).toBe(0)
    expect(readNumber(null)).toBe(0)
    expect(readNumber(undefined)).toBe(0)
    expect(readNumber({})).toBe(0)
  })
})

describe("accumulateUsageEvent", () => {
  it("counts the request and adds the cost and tokens", () => {
    const totals = emptyUsageTotals()
    accumulateUsageEvent(totals, { cost: 0.01, totalTokens: 500 })
    accumulateUsageEvent(totals, { cost: 0.02, totalTokens: 250 })
    expect(totals).toEqual({ requests: 2, tokens: 750, cost: 0.03 })
  })

  it("counts an event with no cost or tokens as a request", () => {
    // Cached hits are recorded with neither; they are still requests served.
    const totals = emptyUsageTotals()
    accumulateUsageEvent(totals, {})
    expect(totals).toEqual({ requests: 1, tokens: 0, cost: 0 })
  })

  it("does not let one malformed document poison the sum", () => {
    const totals = emptyUsageTotals()
    accumulateUsageEvent(totals, { cost: 0.01, totalTokens: 100 })
    accumulateUsageEvent(totals, { cost: NaN, totalTokens: "oops" })
    accumulateUsageEvent(totals, { cost: 0.01, totalTokens: 100 })
    expect(totals.cost).toBeCloseTo(0.02)
    expect(totals.tokens).toBe(200)
    expect(Number.isNaN(totals.cost)).toBe(false)
  })
})

describe("sumUsageEvents", () => {
  it("totals a collection", () => {
    expect(
      sumUsageEvents([
        { cost: 1, totalTokens: 10 },
        { cost: 2, totalTokens: 20 },
      ])
    ).toEqual({
      requests: 2,
      tokens: 30,
      cost: 3,
    })
  })

  it("returns empty totals for no events", () => {
    expect(sumUsageEvents([])).toEqual({ requests: 0, tokens: 0, cost: 0 })
  })
})

describe("bucketUsageEvents", () => {
  const events = [
    { provider: "gemini", cost: 0.01, totalTokens: 100 },
    { provider: "openai-low", cost: 0.05, totalTokens: 400 },
    { provider: "gemini", cost: 0.02, totalTokens: 200 },
  ]

  it("groups by the caller's key", () => {
    const buckets = bucketUsageEvents(events, (e) => e.provider)
    expect(buckets.get("gemini")).toEqual({ requests: 2, tokens: 300, cost: 0.03 })
    expect(buckets.get("openai-low")).toEqual({ requests: 1, tokens: 400, cost: 0.05 })
  })

  it("skips events whose key is null rather than inventing an unknown bucket", () => {
    const buckets = bucketUsageEvents(events, (e) => (e.provider === "gemini" ? null : e.provider))
    expect(buckets.has("gemini")).toBe(false)
    expect(buckets.size).toBe(1)
  })
})

describe("averageTokensPerRequest", () => {
  it("rounds the mean", () => {
    expect(averageTokensPerRequest({ requests: 3, tokens: 1000, cost: 0 })).toBe(333)
  })

  it("returns 0 rather than dividing by zero", () => {
    expect(averageTokensPerRequest({ requests: 0, tokens: 0, cost: 0 })).toBe(0)
  })
})
