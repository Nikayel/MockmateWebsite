/**
 * Pure event-time watermark simulation for the watermark-sim widget: a seeded
 * out-of-order stream, tumbling windows fired when the watermark passes their end,
 * allowed lateness producing corrections, side outputs beyond it, and the
 * processing-time mode where late events land in the WRONG bucket silently.
 */
import { fnv1a } from "./ring-math"

export interface StreamEvent {
  eventTime: number
  arrivalTime: number
  /** Arrived after the watermark had passed its window (needs lateness handling). */
  late: boolean
}

/** Seeded out-of-order stream: skew delays a fraction of events; a few are very late. */
export function watermarkStream(opts: {
  seed: string
  count: number
  horizon: number
  /** Typical arrival skew in ticks; a seeded ~15% of events arrive much later. */
  skew: number
}): StreamEvent[] {
  const { seed, count, horizon, skew } = opts
  const events: StreamEvent[] = []
  for (let i = 0; i < count; i++) {
    const eventTime = fnv1a(`${seed}#t#${i}`) % horizon
    const roll = fnv1a(`${seed}#late#${i}`) % 100
    const delay = roll < 15 ? skew * 3 + (roll % skew) : fnv1a(`${seed}#d#${i}`) % skew
    events.push({ eventTime, arrivalTime: eventTime + 1 + delay, late: false })
  }
  return events.sort((a, b) => a.arrivalTime - b.arrivalTime)
}

export interface WindowResult {
  start: number
  end: number
  /** Count when the window first fired. */
  firedCount: number
  /** Count after in-lateness corrections (equals firedCount when none). */
  finalCount: number
  corrections: number
  sideOutputs: number
  /** Events that belonged here but were bucketed elsewhere (processing-time mode). */
  misbucketed: number
}

export interface WatermarkSimResult {
  windows: WindowResult[]
  totalCorrections: number
  totalSideOutputs: number
  totalMisbucketed: number
  perEvent: { eventTime: number; arrivalTime: number; disposition: string }[]
}

export function simulateWatermark(opts: {
  events: StreamEvent[]
  windowSize: number
  /** Watermark = max event time seen - delay. */
  watermarkDelay: number
  allowedLateness: number
  mode: "event-time" | "processing-time"
}): WatermarkSimResult {
  const { events, windowSize, watermarkDelay, allowedLateness, mode } = opts
  const windows = new Map<number, WindowResult>()
  const windowFor = (time: number) => {
    const start = Math.floor(time / windowSize) * windowSize
    let w = windows.get(start)
    if (!w) {
      w = {
        start,
        end: start + windowSize,
        firedCount: 0,
        finalCount: 0,
        corrections: 0,
        sideOutputs: 0,
        misbucketed: 0,
      }
      windows.set(start, w)
    }
    return w
  }
  const perEvent: WatermarkSimResult["perEvent"] = []
  let maxEventTime = -1

  for (const event of events) {
    if (mode === "processing-time") {
      // Processing time buckets by ARRIVAL: late data lands in the wrong window, silently.
      const w = windowFor(event.arrivalTime)
      w.firedCount++
      w.finalCount++
      const wrong =
        Math.floor(event.arrivalTime / windowSize) !== Math.floor(event.eventTime / windowSize)
      if (wrong) {
        w.misbucketed++
        perEvent.push({ ...pick(event), disposition: "wrong bucket (processing time)" })
      } else perEvent.push({ ...pick(event), disposition: "on time" })
      continue
    }
    maxEventTime = Math.max(maxEventTime, event.eventTime)
    const watermark = maxEventTime - watermarkDelay
    const w = windowFor(event.eventTime)
    if (watermark < w.end) {
      // Window still open: counted in the initial firing.
      w.firedCount++
      w.finalCount++
      perEvent.push({ ...pick(event), disposition: "on time" })
    } else if (watermark < w.end + allowedLateness) {
      // Fired already, but within allowed lateness: a correction re-fires.
      w.finalCount++
      w.corrections++
      perEvent.push({ ...pick(event), disposition: "late: correction re-fired" })
    } else {
      w.sideOutputs++
      perEvent.push({ ...pick(event), disposition: "too late: side output" })
    }
  }

  const list = [...windows.values()].sort((a, b) => a.start - b.start)
  return {
    windows: list,
    totalCorrections: list.reduce((s, w) => s + w.corrections, 0),
    totalSideOutputs: list.reduce((s, w) => s + w.sideOutputs, 0),
    totalMisbucketed: list.reduce((s, w) => s + w.misbucketed, 0),
    perEvent,
  }
}

function pick(e: StreamEvent) {
  return { eventTime: e.eventTime, arrivalTime: e.arrivalTime }
}
