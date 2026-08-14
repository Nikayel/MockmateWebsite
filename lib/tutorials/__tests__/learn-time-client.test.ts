/**
 * Pins the LearnTimeMeter accumulation rules. The meter decides what the client even claims,
 * and the two silent-corruption risks are both here: crediting hidden/idle time (inflation)
 * and dropping a banked span on a state transition (loss). Driven entirely through the
 * injectable clock — no timers, no DOM.
 */
import { describe, it, expect } from "vitest"
import { IDLE_TIMEOUT_MS, LearnTimeMeter } from "../learn-time-client"

/** A meter on a manual clock, starting at t=0. */
function makeMeter() {
  let now = 0
  const meter = new LearnTimeMeter(() => now)
  return {
    meter,
    advance(ms: number) {
      now += ms
    },
  }
}

describe("LearnTimeMeter", () => {
  it("credits a plain visible span", () => {
    const { meter, advance } = makeMeter()
    meter.resume()
    advance(90_000)
    expect(meter.drain()).toBe(90_000)
  })

  it("drain keeps counting: two drains cover the whole span with no gap and no overlap", () => {
    const { meter, advance } = makeMeter()
    meter.resume()
    advance(60_000)
    expect(meter.drain()).toBe(60_000)
    advance(30_000)
    expect(meter.drain()).toBe(30_000)
  })

  it("credits nothing while paused", () => {
    const { meter, advance } = makeMeter()
    meter.resume()
    advance(10_000)
    meter.pause()
    advance(120_000) // hidden tab
    meter.resume()
    advance(5_000)
    expect(meter.drain()).toBe(15_000)
  })

  it("pause banks the span; a drain after pause loses nothing", () => {
    const { meter, advance } = makeMeter()
    meter.resume()
    advance(42_000)
    meter.pause()
    expect(meter.drain()).toBe(42_000)
    expect(meter.drain()).toBe(0)
  })

  it("idle sweep credits at most one idle-timeout past the last activity", () => {
    const { meter, advance } = makeMeter()
    meter.resume()
    advance(60_000)
    meter.activity() // last input at t=60s
    advance(IDLE_TIMEOUT_MS + 10 * 60_000) // walks away for 13 minutes
    meter.checkIdle()
    expect(meter.drain()).toBe(60_000 + IDLE_TIMEOUT_MS)
  })

  it("idle sweep within the timeout is a no-op", () => {
    const { meter, advance } = makeMeter()
    meter.resume()
    advance(IDLE_TIMEOUT_MS - 1000)
    meter.checkIdle()
    advance(1000)
    expect(meter.drain()).toBe(IDLE_TIMEOUT_MS)
  })

  it("activity after an idle pause restarts counting from the activity, not the gap", () => {
    const { meter, advance } = makeMeter()
    meter.resume()
    advance(IDLE_TIMEOUT_MS + 60_000)
    meter.checkIdle() // banks IDLE_TIMEOUT_MS, stops
    advance(30 * 60_000) // long absence, still stopped
    meter.activity() // learner returns
    advance(20_000)
    expect(meter.drain()).toBe(IDLE_TIMEOUT_MS + 20_000)
  })

  it("resume while already counting does not double-count", () => {
    const { meter, advance } = makeMeter()
    meter.resume()
    advance(10_000)
    meter.resume()
    advance(10_000)
    expect(meter.drain()).toBe(20_000)
  })

  it("a meter never resumed credits nothing", () => {
    const { meter, advance } = makeMeter()
    advance(60 * 60_000)
    meter.checkIdle()
    expect(meter.drain()).toBe(0)
  })
})
