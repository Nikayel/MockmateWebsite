import { describe, it, expect } from "vitest"
import { buildExperimentReadout, EXPERIMENT_DESIGN } from "./experiment-readout"
import { summarizeReadiness } from "./readiness"
import type { SampleSizeAnalysis } from "./statistics"
import type { UserObservation, UserObservationSet } from "./user-observations"

function arm(algorithm: "sm2" | "fsrs", count: number, meanRetention: number): UserObservation[] {
  return Array.from({ length: count }, (_, index) => {
    const offset = (index % 2 === 0 ? 1 : -1) * 0.1 * ((index % 5) / 4)
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

function sampleAnalysis(power: number): SampleSizeAnalysis {
  return {
    currentSampleSm2: 0,
    currentSampleFsrs: 0,
    totalSample: 0,
    isSufficient: false,
    minimumRequired: 30,
    recommendedForPower80: 100,
    recommendedForPower95: 200,
    estimatedDaysToSufficient: null,
    powerWithCurrentSample: power,
  }
}

function readinessFor(
  sm2Count: number,
  fsrsCount: number,
  assigned?: { control: number; treatment: number },
  power = 0.42
) {
  const readout = buildExperimentReadout({
    observations: observationSet(arm("sm2", sm2Count, 0.7), arm("fsrs", fsrsCount, 0.72)),
    assignedControl: assigned?.control ?? sm2Count,
    assignedTreatment: assigned?.treatment ?? fsrsCount,
    window: {
      start: "2026-07-09T00:00:00.000Z",
      end: "2026-08-08T00:00:00.000Z",
      eventsAnalyzed: 500,
      truncated: false,
    },
  })
  return summarizeReadiness(readout, sampleAnalysis(power))
}

describe("experiment readiness", () => {
  it("reports users per arm, the required sample, power, the SRM check and tests run", () => {
    const readiness = readinessFor(40, 40, undefined, 0.42)

    expect(readiness.usersControl).toBe(40)
    expect(readiness.usersTreatment).toBe(40)
    expect(readiness.requiredUsersPerArm).toBeGreaterThan(0)
    expect(readiness.powerAtCurrentSample).toBe(0.42)
    expect(readiness.sampleRatioMismatch).toBe(false)
    expect(readiness.observedControlShare).toBeCloseTo(0.5, 5)
    expect(readiness.expectedControlShare).toBe(EXPERIMENT_DESIGN.designedControlShare)
    expect(readiness.declaredTests).toBe(EXPERIMENT_DESIGN.familyMetrics.length)
    expect(readiness.testsRun).toBe(EXPERIMENT_DESIGN.familyMetrics.length)
  })

  it("counts only the declared metrics that actually ran", () => {
    // Below the minimum users per arm no metric is tested, so none may be counted.
    const readiness = readinessFor(10, 10)

    expect(readiness.declaredTests).toBe(EXPERIMENT_DESIGN.familyMetrics.length)
    expect(readiness.testsRun).toBe(0)
  })

  it("does not call the required sample met until both arms reach it", () => {
    const short = readinessFor(40, 40)
    expect(short.meetsRequiredSample).toBe(false)

    const oneArmShort = readinessFor(240, 40)
    expect(oneArmShort.meetsRequiredSample).toBe(false)

    const met = readinessFor(240, 240)
    expect(met.requiredUsersPerArm).not.toBeNull()
    expect(met.usersControl).toBeGreaterThanOrEqual(met.requiredUsersPerArm!)
    expect(met.meetsRequiredSample).toBe(true)
  })

  it("carries the sample ratio mismatch through instead of scoring it", () => {
    const readiness = readinessFor(40, 40, { control: 400, treatment: 100 })

    expect(readiness.sampleRatioMismatch).toBe(true)
    expect(readiness.sampleRatioPValue).toBeLessThan(0.05)
    expect(readiness.observedControlShare).toBeCloseTo(0.8, 5)
  })

  it("produces no composite score and no quality verdict", () => {
    const readiness = readinessFor(240, 240, undefined, 0.91)

    // Every reported figure is a measurement, so there is nowhere for a prose
    // verdict like "Research-grade quality" to live and no total to invent
    // weights for.
    for (const [key, value] of Object.entries(readiness)) {
      expect(
        typeof value === "number" || typeof value === "boolean" || value === null,
        `${key} should be a measured figure, not prose`
      ).toBe(true)
      expect(key).not.toMatch(/quality|grade|overall|interpretation|rating|confidence/i)
    }

    // A significant result must not feed back into how ready the experiment is
    // reported to be. The old ladder added 10 points for finding one.
    const withoutEffect = summarizeReadiness(
      buildExperimentReadout({
        observations: observationSet(arm("sm2", 240, 0.7), arm("fsrs", 240, 0.7)),
        assignedControl: 240,
        assignedTreatment: 240,
        window: {
          start: "2026-07-09T00:00:00.000Z",
          end: "2026-08-08T00:00:00.000Z",
          eventsAnalyzed: 500,
          truncated: false,
        },
      }),
      sampleAnalysis(0.91)
    )
    const withLargeEffect = summarizeReadiness(
      buildExperimentReadout({
        observations: observationSet(arm("sm2", 240, 0.5), arm("fsrs", 240, 0.9)),
        assignedControl: 240,
        assignedTreatment: 240,
        window: {
          start: "2026-07-09T00:00:00.000Z",
          end: "2026-08-08T00:00:00.000Z",
          eventsAnalyzed: 500,
          truncated: false,
        },
      }),
      sampleAnalysis(0.91)
    )
    expect(withLargeEffect).toEqual(withoutEffect)
  })
})
