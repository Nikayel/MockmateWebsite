import { describe, expect, it } from "vitest"

import {
  ANCHORS,
  closeDurationMs,
  isStalled,
  opaqueProgress,
  progressFor,
  SCORING_PROGRESS_INTERNALS as I,
  stepForFraction,
  type ScoringSignal,
} from "../scoring-progress"

/**
 * The model's whole value is that its safety properties are STRUCTURAL rather than
 * tuned: you can get the duration estimates badly wrong and the ring still cannot
 * lie. These tests pin the properties, not the numbers, so re-fitting the segment
 * table against real measurements does not require touching them.
 */

const SIGNALS: ScoringSignal[] = ["connect", "analyzing", "generating", "persisting"]

describe("scoring progress model", () => {
  describe("anchors", () => {
    it("are strictly increasing in signal order", () => {
      const values = SIGNALS.map((s) => ANCHORS[s])
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1])
      }
    })

    it("start at the lead and stay under the ceiling", () => {
      expect(ANCHORS.connect).toBe(I.LEAD)
      for (const s of SIGNALS) expect(ANCHORS[s]).toBeLessThan(I.CEILING)
    })

    it("reach 1 only when the results have landed", () => {
      expect(ANCHORS.done).toBe(1)
    })

    it("advance at a constant rate across segments, so a speed change means something", () => {
      // Equal velocity is what makes the ring legible: any change in pace the user
      // perceives is information about their run, not an artefact of the model.
      const rates = I.SEGMENTS.map((seg, i) => {
        const next = i + 1 < I.SEGMENTS.length ? ANCHORS[I.SEGMENTS[i + 1].signal] : I.CEILING
        return (next - ANCHORS[seg.signal]) / seg.expectedMs
      })
      for (const r of rates) expect(r).toBeCloseTo(rates[0], 9)
    })
  })

  describe("creep", () => {
    it("is monotonic within a segment", () => {
      for (const s of SIGNALS) {
        let prev = -1
        for (let t = 0; t <= 120_000; t += 250) {
          const p = progressFor(s, t)
          expect(p).toBeGreaterThanOrEqual(prev)
          prev = p
        }
      }
    })

    it("starts exactly at the segment's own anchor", () => {
      for (const s of SIGNALS) expect(progressFor(s, 0)).toBeCloseTo(ANCHORS[s], 10)
    })

    it("NEVER reaches the next anchor, however long the segment runs", () => {
      // This is the property that makes overtaking impossible. If it ever fails,
      // the ring can claim a milestone the pipeline has not actually hit.
      for (let i = 0; i < I.SEGMENTS.length - 1; i++) {
        const here = I.SEGMENTS[i].signal
        const next = ANCHORS[I.SEGMENTS[i + 1].signal]
        for (const t of [0, 1_000, 10_000, 45_000, 60_000, 300_000, 1e9]) {
          expect(progressFor(here, t), `${here} at ${t}ms overtook ${next}`).toBeLessThan(next)
        }
      }
    })

    it("never reaches the ceiling while work is still running", () => {
      for (const s of SIGNALS) {
        for (const t of [0, 30_000, 120_000, 1e9]) {
          expect(progressFor(s, t)).toBeLessThanOrEqual(I.CEILING)
        }
      }
      expect(progressFor("persisting", 1e9)).toBeLessThanOrEqual(I.CEILING)
    })

    it("is still visibly moving deep into a slow segment", () => {
      // The reason for a hyperbolic rather than exponential tail. At 4x the expected
      // duration an exponential is numerically frozen; this must still crawl.
      const a = progressFor("generating", 48_000)
      const b = progressFor("generating", 51_000)
      expect(b).toBeGreaterThan(a)
      expect(b - a).toBeGreaterThan(1e-4)
    })

    it("covers most of a segment by its expected duration, so the median run feels right", () => {
      for (const seg of I.SEGMENTS) {
        const from = ANCHORS[seg.signal]
        const i = I.SEGMENTS.indexOf(seg)
        const to = i + 1 < I.SEGMENTS.length ? ANCHORS[I.SEGMENTS[i + 1].signal] : I.CEILING
        const covered = (progressFor(seg.signal, seg.expectedMs) - from) / (to - from)
        expect(covered).toBeGreaterThan(0.8)
        expect(covered).toBeLessThan(0.9)
      }
    })
  })

  describe("opaque path", () => {
    it("walks from the lead toward the ceiling without reaching it", () => {
      expect(opaqueProgress(0)).toBeCloseTo(I.LEAD, 10)
      expect(opaqueProgress(30_000)).toBeGreaterThan(opaqueProgress(10_000))
      expect(opaqueProgress(1e9)).toBeLessThanOrEqual(I.CEILING)
    })

    it("is still moving at 60s, where the system-design wait actually lives", () => {
      expect(opaqueProgress(63_000)).toBeGreaterThan(opaqueProgress(60_000))
    })
  })

  describe("checklist derivation", () => {
    it("advances monotonically with progress", () => {
      let prev = -1
      for (let p = 0; p <= 1.0001; p += 0.005) {
        const step = stepForFraction(p, 4)
        expect(step).toBeGreaterThanOrEqual(prev)
        prev = step
      }
    })

    it("puts each signal's own anchor on its own row", () => {
      I.SEGMENTS.forEach((seg, i) => {
        expect(stepForFraction(ANCHORS[seg.signal], I.SEGMENTS.length)).toBe(i)
      })
    })

    it("never exceeds the rows it was given", () => {
      for (const p of [0, 0.5, 0.97, 1]) {
        expect(stepForFraction(p, 4)).toBeLessThanOrEqual(3)
        expect(stepForFraction(p, 2)).toBeLessThanOrEqual(1)
      }
    })
  })

  describe("stall detection", () => {
    it("stays quiet through a normal segment", () => {
      for (const seg of I.SEGMENTS) {
        expect(isStalled(seg.signal, seg.expectedMs)).toBe(false)
      }
    })

    it("fires once a segment runs far past its expectation", () => {
      for (const seg of I.SEGMENTS) {
        expect(isStalled(seg.signal, seg.expectedMs * 4)).toBe(true)
      }
    })
  })

  describe("closing sweep", () => {
    it("gives a fast answer a longer close than a slow one", () => {
      // The asymmetry is the point: after a long wait, a victory lap is an insult.
      expect(closeDurationMs(0.2)).toBeGreaterThan(closeDurationMs(0.9))
    })

    it("stays inside a sane range at both extremes", () => {
      for (const p of [0, 0.25, 0.5, 0.75, 0.97, 1]) {
        expect(closeDurationMs(p)).toBeGreaterThanOrEqual(260)
        expect(closeDurationMs(p)).toBeLessThanOrEqual(620)
      }
    })
  })
})
