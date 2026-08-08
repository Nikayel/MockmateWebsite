import { describe, it, expect } from "vitest"
import { buildExperimentReadout, EXPERIMENT_DESIGN, formatPValue } from "./experiment-readout"
import type { UserObservation, UserObservationSet } from "./user-observations"

/**
 * Build an arm of user observations. `retention` is spread deterministically
 * around the requested mean so the arms have real variance without randomness
 * making the test flaky.
 */
function arm(
  algorithm: "sm2" | "fsrs",
  count: number,
  meanRetention: number,
  spread = 0.1
): UserObservation[] {
  return Array.from({ length: count }, (_, index) => {
    const offset = (index % 2 === 0 ? 1 : -1) * spread * ((index % 5) / 4)
    return {
      userId: `${algorithm}-${index}`,
      algorithm,
      reviews: 5,
      meanScore: 70 + offset * 100,
      retentionRate: Math.min(1, Math.max(0, meanRetention + offset)),
      intervalAccuracy: Math.min(1, Math.max(0, 0.6 + offset)),
      firstEventAt: "2026-07-01T00:00:00.000Z",
      lastEventAt: "2026-07-30T00:00:00.000Z",
    }
  })
}

function observationSet(sm2: UserObservation[], fsrs: UserObservation[]): UserObservationSet {
  return {
    sm2,
    fsrs,
    eventsUsed: (sm2.length + fsrs.length) * 5,
    usersWithMixedAssignment: 0,
    eventsDiscarded: 0,
  }
}

const WINDOW = {
  start: "2026-07-09T00:00:00.000Z",
  end: "2026-08-08T00:00:00.000Z",
  eventsAnalyzed: 500,
  truncated: false,
}

function readoutFor(
  sm2: UserObservation[],
  fsrs: UserObservation[],
  assigned?: { control: number; treatment: number }
) {
  return buildExperimentReadout({
    observations: observationSet(sm2, fsrs),
    assignedControl: assigned?.control ?? sm2.length,
    assignedTreatment: assigned?.treatment ?? fsrs.length,
    window: WINDOW,
  })
}

describe("insufficient data", () => {
  it("refuses to print any number below the minimum users per arm", () => {
    const readout = readoutFor(arm("sm2", 12, 0.7), arm("fsrs", 9, 0.8))

    expect(readout.verdict).toBe("not_enough_data")
    expect(readout.primary.test).toBeNull()
    expect(readout.primary.adjustedPValue).toBeNull()
    expect(readout.primary.significant).toBe(false)
    expect(readout.headline).toBe("Not enough data yet to say which algorithm is better")
    expect(readout.detail).toContain("SM-2 has 12 and FSRS has 9")
    // The old banner could never say less than 74% confident. This one says nothing.
    expect(readout.detail).not.toMatch(/\d+% confiden/)
  })

  it("does not test a metric when only one arm clears the bar", () => {
    const readout = readoutFor(arm("sm2", 40, 0.7), arm("fsrs", 29, 0.7))
    expect(readout.primary.test).toBeNull()
    expect(readout.primary.unavailableReason).toContain("30 users per arm")
  })

  it("still reports how many more users each arm needs", () => {
    const readout = readoutFor(arm("sm2", 10, 0.7), arm("fsrs", 10, 0.7))
    // 175 per arm for d = 0.3 at 80% power.
    expect(readout.sample.usersNeededPerArm).toBe(175)
    expect(readout.sample.moreUsersNeededControl).toBe(165)
    expect(readout.sample.moreUsersNeededTreatment).toBe(165)
  })
})

describe("sample ratio mismatch", () => {
  it("invalidates the whole readout when assignment is broken", () => {
    // 1000 vs 1200 assigned: chi-square p = 2.0e-05, far below the 0.001 alarm.
    const readout = readoutFor(arm("sm2", 60, 0.7), arm("fsrs", 60, 0.9), {
      control: 1000,
      treatment: 1200,
    })

    expect(readout.sampleRatio.mismatch).toBe(true)
    expect(readout.verdict).toBe("invalid_split")
    expect(readout.headline).toContain("Sample ratio mismatch")
    expect(readout.detail).toContain("45.5%")
  })

  it("outranks a significant primary metric", () => {
    // The primary metric would otherwise declare FSRS the winner.
    const readout = readoutFor(arm("sm2", 60, 0.5), arm("fsrs", 60, 0.9), {
      control: 1000,
      treatment: 1200,
    })
    expect(readout.primary.significant).toBe(true)
    expect(readout.verdict).toBe("invalid_split")
  })

  it("passes a healthy split through", () => {
    const readout = readoutFor(arm("sm2", 60, 0.7), arm("fsrs", 62, 0.7), {
      control: 520,
      treatment: 480,
    })
    expect(readout.sampleRatio.mismatch).toBe(false)
    expect(readout.verdict).not.toBe("invalid_split")
  })
})

describe("verdicts", () => {
  it("declares a winner only with a corrected significant primary metric", () => {
    const readout = readoutFor(arm("sm2", 80, 0.55), arm("fsrs", 80, 0.85))

    expect(readout.verdict).toBe("fsrs_better")
    expect(readout.primary.significant).toBe(true)
    expect(readout.primary.adjustedPValue).not.toBeNull()
    expect(readout.primary.adjustedPValue!).toBeLessThan(0.05)
    expect(readout.headline).toContain("FSRS is ahead")
    expect(readout.detail).toContain("95% interval")
    expect(readout.detail).toContain("effect size d =")
    expect(readout.detail).toContain("n = 80 SM-2 vs 80 FSRS")
  })

  it("names SM-2 when SM-2 leads", () => {
    const readout = readoutFor(arm("sm2", 80, 0.85), arm("fsrs", 80, 0.55))
    expect(readout.verdict).toBe("sm2_better")
    expect(readout.headline).toContain("SM-2 is ahead")
  })

  it("reports no difference when the interval spans zero", () => {
    const readout = readoutFor(arm("sm2", 60, 0.7), arm("fsrs", 60, 0.705))

    expect(readout.verdict).toBe("no_difference_detected")
    expect(readout.primary.significant).toBe(false)
    expect(readout.detail).toContain("spans no difference")
    // An honest null result says what it does not prove.
    expect(readout.detail).toContain("not evidence the algorithms are equal")
  })

  it("applies the Holm correction across the metric family", () => {
    const readout = readoutFor(arm("sm2", 60, 0.6), arm("fsrs", 60, 0.75))
    const tested = [readout.primary, ...readout.secondary].filter((metric) => metric.test)
    expect(tested.length).toBeGreaterThan(1)
    for (const metric of tested) {
      expect(metric.adjustedPValue!).toBeGreaterThanOrEqual(metric.test!.pValue)
    }
  })

  it("keeps the effect size interval alongside the point estimate", () => {
    const readout = readoutFor(arm("sm2", 60, 0.55), arm("fsrs", 60, 0.85))
    const effect = readout.primary.test!.effectSize
    expect(effect.interval.lower).toBeLessThan(effect.d)
    expect(effect.interval.upper).toBeGreaterThan(effect.d)
  })
})

describe("supporting numbers the founder needs", () => {
  it("reports n per arm, the MDE and the activation guardrail", () => {
    const readout = readoutFor(arm("sm2", 60, 0.7), arm("fsrs", 50, 0.7), {
      control: 120,
      treatment: 118,
    })

    expect(readout.sample.usersControl).toBe(60)
    expect(readout.sample.usersTreatment).toBe(50)
    expect(readout.sample.assignedControl).toBe(120)
    expect(readout.sample.minimumDetectableEffect).toBeGreaterThan(0)

    // 60/120 vs 50/118 activation.
    expect(readout.activation!.successesControl).toBe(60)
    expect(readout.activation!.nTreatment).toBe(118)
    expect(readout.activation!.approximationValid).toBe(true)
  })

  it("carries the declared design and stopping rule with the result", () => {
    const readout = readoutFor(arm("sm2", 40, 0.7), arm("fsrs", 40, 0.7))
    expect(readout.design.primaryMetric).toBe("retention")
    expect(readout.design.multipleComparisonCorrection).toBe("holm-bonferroni")
    expect(readout.design.stoppingRule).toContain("Fixed horizon")
    expect(readout.design.targetEffectSize).toBe(EXPERIMENT_DESIGN.targetEffectSize)
  })

  it("surfaces users excluded for appearing in both arms", () => {
    const set = observationSet(arm("sm2", 40, 0.7), arm("fsrs", 40, 0.7))
    set.usersWithMixedAssignment = 3
    const readout = buildExperimentReadout({
      observations: set,
      assignedControl: 40,
      assignedTreatment: 40,
      window: WINDOW,
    })
    expect(readout.sample.usersWithMixedAssignment).toBe(3)
  })

  it("carries the analysis window instead of an event cap", () => {
    const readout = readoutFor(arm("sm2", 40, 0.7), arm("fsrs", 40, 0.7))
    expect(readout.window.start).toBe(WINDOW.start)
    expect(readout.window.truncated).toBe(false)
  })
})

describe("formatPValue", () => {
  it("bounds tiny p-values instead of implying false precision", () => {
    expect(formatPValue(0.00000001)).toBe("< 0.0001")
    expect(formatPValue(0.0321)).toBe("0.0321")
  })
})
