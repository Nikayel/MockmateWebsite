/**
 * Table-driven tables for the Iteration 8 sim math (exit criteria): the fixed-window
 * boundary burst really admits ~2x the limit while token bucket and sliding window
 * hold the line, and quorum overlap/availability/Kafka/BFT numbers are exact.
 */
import { describe, it, expect } from "vitest"
import {
  fixedWindow,
  requestStream,
  slidingWindow,
  tokenBucket,
  worstWindowLoad,
} from "../limiter-math"
import {
  analyzeQuorum,
  availableUnderFailures,
  bftTolerated,
  kafkaAckedWriteSurvives,
} from "../quorum-math"

describe("limiter math", () => {
  const burst = requestStream({ seed: "demo", count: 30, horizon: 100, burstAt: 50, burstSize: 16 })

  it("streams are deterministic for a seed", () => {
    expect(requestStream({ seed: "a", count: 10, horizon: 50 })).toEqual(
      requestStream({ seed: "a", count: 10, horizon: 50 })
    )
    expect(requestStream({ seed: "a", count: 10, horizon: 50 })).not.toEqual(
      requestStream({ seed: "b", count: 10, horizon: 50 })
    )
  })

  it("fixed window admits ~2x the limit through a window boundary (the aha)", () => {
    const verdicts = fixedWindow(burst, { limit: 10, windowSize: 10 })
    const worst = worstWindowLoad(verdicts, 10)
    expect(worst).toBeGreaterThan(12) // well above the nominal 10/window
  })

  it("sliding window holds the trailing-window line under the same burst", () => {
    const verdicts = slidingWindow(burst, { limit: 10, windowSize: 10 })
    expect(worstWindowLoad(verdicts, 10)).toBeLessThanOrEqual(10)
  })

  it("token bucket allows a burst up to capacity then throttles to the refill rate", () => {
    const tight = Array.from({ length: 12 }, (_, i) => ({ at: 100 + i }))
    const verdicts = tokenBucket(tight, { capacity: 5, refillPerTick: 0 })
    expect(verdicts.filter((v) => v.allowed)).toHaveLength(5)
    // With refill 1/tick, each subsequent tick admits one more.
    const refill = tokenBucket(tight, { capacity: 5, refillPerTick: 1 })
    expect(refill.filter((v) => v.allowed).length).toBeGreaterThan(5)
  })

  it.each([
    { limit: 5, windowSize: 20 },
    { limit: 10, windowSize: 10 },
  ])(
    "no algorithm ever admits above its instantaneous cap ($limit/$windowSize)",
    ({ limit, windowSize }) => {
      const verdicts = slidingWindow(burst, { limit, windowSize })
      expect(worstWindowLoad(verdicts, windowSize)).toBeLessThanOrEqual(limit)
    }
  )
})

describe("quorum math", () => {
  it.each([
    { n: 3, r: 2, w: 2, overlap: true },
    { n: 3, r: 1, w: 2, overlap: false },
    { n: 5, r: 2, w: 3, overlap: false },
    { n: 5, r: 3, w: 3, overlap: true },
    { n: 5, r: 1, w: 5, overlap: true },
  ])("N=$n R=$r W=$w overlap=$overlap", ({ n, r, w, overlap }) => {
    expect(analyzeQuorum(n, r, w).overlapGuaranteed).toBe(overlap)
  })

  it("write availability degrades exactly at N - W kills", () => {
    expect(availableUnderFailures(5, 3, 2)).toBe(true)
    expect(availableUnderFailures(5, 3, 3)).toBe(false)
  })

  it.each([
    { rf: 3, minInsync: 2, killed: 1, writable: true, survives: true },
    { rf: 3, minInsync: 2, killed: 2, writable: false, survives: false },
    { rf: 3, minInsync: 1, killed: 1, writable: true, survives: false },
  ])(
    "kafka rf=$rf min.insync=$minInsync killed=$killed",
    ({ rf, minInsync, killed, writable, survives }) => {
      const result = kafkaAckedWriteSurvives({
        replicationFactor: rf,
        minInsync,
        killedBrokers: killed,
      })
      expect(result.writable).toBe(writable)
      expect(result.ackedSurvives).toBe(survives)
    }
  )

  it.each([
    { n: 3, f: 0 },
    { n: 4, f: 1 },
    { n: 6, f: 1 },
    { n: 7, f: 2 },
    { n: 10, f: 3 },
  ])("bft N=$n tolerates f=$f", ({ n, f }) => {
    expect(bftTolerated(n)).toBe(f)
  })
})
