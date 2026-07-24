/**
 * Tables for the Iteration 9 temporal sims: partition merges are BAKED and exact
 * (the render-facing exit criterion), replication lag spikes and the vanishing
 * comment is cured two ways, and watermark dispositions move with lateness and mode.
 */
import { describe, it, expect } from "vitest"
import { applyWrite, heal, initialWorld, type ScriptedWrite } from "../partition-math"
import { readYourWrites, simulateReplication } from "../replication-math"
import { simulateWatermark, watermarkStream } from "../watermark-math"

describe("partition math", () => {
  const writes: ScriptedWrite[] = [
    { side: "A", value: "blue", label: "A sets theme=blue" },
    { side: "B", value: "green", label: "B sets theme=green" },
  ]

  function playRegister(mode: "cp" | "ap") {
    let world = initialWorld()
    const results = writes.map((w, i) => {
      const out = applyWrite(world, "register", w, i + 1, true, mode)
      world = out.world
      return out.result
    })
    return { world, results }
  }

  it("CP: the minority side refuses during the partition", () => {
    const { results } = playRegister("cp")
    expect(results[0].accepted).toBe(true)
    expect(results[1].accepted).toBe(false)
    expect(results[1].reason).toContain("quorum")
  })

  it("AP + LWW: heal silently drops the earlier-stamped write, by name", () => {
    const { world } = playRegister("ap")
    const outcome = heal(world, "register", "lww")
    expect(outcome.merged.register?.value).toBe("green")
    expect(outcome.dropped).toEqual(["A sets theme=blue"])
    expect(outcome.narrative).toContain("SILENTLY DISCARDED")
  })

  it("AP + version vectors: both concurrent writes survive as siblings", () => {
    const { world } = playRegister("ap")
    const outcome = heal(world, "register", "version-vector")
    expect(outcome.siblings).toEqual(["blue", "green"])
    expect(outcome.dropped).toEqual([])
    expect(outcome.narrative).toContain("CONCURRENT")
  })

  it("PN-counter merge sums both sides' increments exactly", () => {
    let world = initialWorld()
    world = applyWrite(
      world,
      "counter",
      { side: "A", value: "3", label: "A +3" },
      1,
      true,
      "ap"
    ).world
    world = applyWrite(
      world,
      "counter",
      { side: "B", value: "2", label: "B +2" },
      2,
      true,
      "ap"
    ).world
    const outcome = heal(world, "counter", "crdt-counter")
    expect(outcome.merged.counter.A + outcome.merged.counter.B).toBe(5)
    expect(outcome.dropped).toEqual([])
  })

  it("set union keeps both sides' additions", () => {
    let world = initialWorld()
    world = applyWrite(
      world,
      "set",
      { side: "A", value: "red", label: "A adds red" },
      1,
      true,
      "ap"
    ).world
    world = applyWrite(
      world,
      "set",
      { side: "B", value: "gold", label: "B adds gold" },
      2,
      true,
      "ap"
    ).world
    const outcome = heal(world, "set", "crdt-set")
    expect(outcome.merged.elements).toEqual(["gold", "red"])
    expect(outcome.dropped).toEqual([])
  })
})

describe("replication math", () => {
  const timeline = simulateReplication({
    ticks: 120,
    writeRate: 2,
    burst: { from: 30, to: 45, multiplier: 4 },
    applyRate: 3,
    followerCount: 2,
  })

  it("the burst spikes lag; a fast follower drains, a barely-keeping-up one stays wedged", () => {
    // Follower 0 applies 3/tick against steady writes of 2/tick: it drains the spike.
    const fast = timeline.lag[0]
    const fastPeak = Math.max(...fast)
    expect(fastPeak).toBeGreaterThan(10)
    expect(fast[fast.length - 1]).toBeLessThan(fastPeak / 2)
    // Follower 1 applies exactly 2/tick: it never recovers the burst backlog. That
    // wedge is a teaching point, not a bug: apply rate must EXCEED write rate to heal.
    const slow = timeline.lag[1]
    const slowPeak = Math.max(...slow)
    expect(slow[slow.length - 1]).toBeGreaterThan(slowPeak * 0.9)
  })

  it("the comment vanishes on a lagging replica with no cure", () => {
    const outcome = readYourWrites(timeline, {
      writeTick: 40,
      readTick: 42,
      follower: 1,
      cure: "none",
    })
    expect(outcome.visible).toBe(false)
    expect(outcome.narrative).toContain("VANISHED")
  })

  it("sticky routing cures it via the leader; a version token cures it by waiting", () => {
    const sticky = readYourWrites(timeline, {
      writeTick: 40,
      readTick: 42,
      follower: 1,
      cure: "sticky",
    })
    expect(sticky.visible).toBe(true)
    expect(sticky.servedBy).toContain("leader")
    const token = readYourWrites(timeline, {
      writeTick: 40,
      readTick: 42,
      follower: 1,
      cure: "version-token",
    })
    expect(token.visible).toBe(true)
    expect(token.waitedTicks).toBeGreaterThan(0)
  })
})

describe("watermark math", () => {
  const events = watermarkStream({ seed: "clicks", count: 60, horizon: 120, skew: 6 })

  it("streams are deterministic and contain genuinely late arrivals", () => {
    expect(watermarkStream({ seed: "clicks", count: 60, horizon: 120, skew: 6 })).toEqual(events)
    expect(events.some((e) => e.arrivalTime - e.eventTime > 12)).toBe(true)
  })

  it("event-time mode: corrections within lateness, side outputs beyond it", () => {
    const generous = simulateWatermark({
      events,
      windowSize: 20,
      watermarkDelay: 4,
      allowedLateness: 30,
      mode: "event-time",
    })
    const strict = simulateWatermark({
      events,
      windowSize: 20,
      watermarkDelay: 4,
      allowedLateness: 0,
      mode: "event-time",
    })
    expect(generous.totalCorrections).toBeGreaterThan(0)
    expect(strict.totalSideOutputs).toBeGreaterThan(generous.totalSideOutputs)
  })

  it("processing-time mode buckets late data wrongly, silently", () => {
    const result = simulateWatermark({
      events,
      windowSize: 20,
      watermarkDelay: 4,
      allowedLateness: 10,
      mode: "processing-time",
    })
    expect(result.totalMisbucketed).toBeGreaterThan(0)
    expect(result.totalSideOutputs).toBe(0)
  })

  it("every event gets exactly one disposition", () => {
    const result = simulateWatermark({
      events,
      windowSize: 20,
      watermarkDelay: 4,
      allowedLateness: 10,
      mode: "event-time",
    })
    expect(result.perEvent).toHaveLength(events.length)
  })
})
