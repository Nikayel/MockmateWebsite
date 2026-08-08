/**
 * The single answer the research page exists to give: which spaced repetition
 * algorithm is winning, and how sure can the founder be.
 *
 * The number this replaces was `Math.min(95, 60 + wins * 7)`. It counted how
 * many of five metrics one arm happened to lead on and turned that count into a
 * percentage labelled "confidence". It could not go below 74%, it never touched
 * the data's variance, sample size or noise, and it was printed next to the
 * word "confidence" in a banner and exported to CSV.
 *
 * What replaces it:
 *
 *  - a declared PRIMARY metric, so the decision is not made by whichever metric
 *    looks best today,
 *  - user-level tests (see user-observations.ts) with real p-values and
 *    intervals,
 *  - a Holm correction across the three metrics tested together,
 *  - a sample ratio mismatch check that can invalidate everything else,
 *  - a stopping rule and a minimum-detectable-effect computed from the sample
 *    actually collected,
 *  - and an explicit "not enough data yet" state that prints no number at all.
 *
 * "We cannot tell yet" is a correct and useful answer. A fabricated percentage
 * is not.
 */

import {
  checkSampleRatioMismatch,
  holmBonferroni,
  minimumDetectableEffect,
  requiredSampleSizePerArm,
  twoProportionZTest,
  welchTTest,
  type SampleRatioResult,
  type TwoProportionResult,
  type WelchTTestResult,
} from "./experiment-stats"
import { metricValues, type UserObservation, type UserObservationSet } from "./user-observations"

// ============================================
// Declared design
// ============================================

export type MetricKey = "retention" | "score" | "intervalAccuracy"

export interface ExperimentDesign {
  experimentId: string
  controlArm: "sm2"
  treatmentArm: "fsrs"
  /** Share of users the assignment coin is supposed to send to control. */
  designedControlShare: number
  alpha: number
  power: number
  /** The effect the experiment was sized to detect, in Cohen's d. */
  targetEffectSize: number
  /** Below this many users per arm nothing is reported at all. */
  minUsersPerArm: number
  primaryMetric: MetricKey
  familyMetrics: MetricKey[]
  multipleComparisonCorrection: "holm-bonferroni"
  stoppingRule: string
}

/**
 * The experiment's declared design. Written down here so it cannot drift with
 * whichever result the reader is hoping for, and surfaced in the UI so the
 * reader can check the analysis against the plan.
 *
 * The stopping rule is fixed-horizon on purpose. Peeking at a running
 * experiment and stopping the moment p dips under 0.05 inflates the false
 * positive rate to roughly 30% for a dashboard refreshed daily, and this
 * dashboard is refreshed on every page load. Either both arms clear the
 * planned sample size, or the answer is "keep collecting".
 */
export const EXPERIMENT_DESIGN: ExperimentDesign = {
  experimentId: "sm2-vs-fsrs-v1",
  controlArm: "sm2",
  treatmentArm: "fsrs",
  designedControlShare: 0.5,
  alpha: 0.05,
  power: 0.8,
  targetEffectSize: 0.3,
  minUsersPerArm: 30,
  primaryMetric: "retention",
  familyMetrics: ["retention", "score", "intervalAccuracy"],
  multipleComparisonCorrection: "holm-bonferroni",
  stoppingRule:
    "Fixed horizon. Do not act on an interim result: wait until both arms reach the planned users per arm, then read the primary metric once. Stopping the moment a p-value dips below 0.05 turns a 5% false positive rate into roughly 30%.",
}

const METRIC_LABELS: Record<MetricKey, { label: string; description: string; unit: MetricUnit }> = {
  retention: {
    label: "Retention rate",
    description: "Share of a user's reviews recalled correctly",
    unit: "proportion",
  },
  score: {
    label: "Average score",
    description: "Mean interview score across a user's reviews",
    unit: "points",
  },
  intervalAccuracy: {
    label: "Interval accuracy",
    description: "Share of a user's reviews where the schedule predicted recall correctly",
    unit: "proportion",
  },
}

export type MetricUnit = "proportion" | "points"

// ============================================
// Readout shape
// ============================================

export interface MetricReadout {
  key: MetricKey
  label: string
  description: string
  unit: MetricUnit
  isPrimary: boolean
  /** Users contributing a value for this metric, per arm. */
  nControl: number
  nTreatment: number
  /** null when the metric could not be tested; the UI must print no number. */
  test: WelchTTestResult | null
  /** Holm-adjusted p-value across the metric family, null when untested. */
  adjustedPValue: number | null
  /** Significant after correction. Never true when `test` is null. */
  significant: boolean
  /** Which arm the point estimate favours, independent of significance. */
  favours: "sm2" | "fsrs" | "neither"
  /** Why the metric could not be tested, when it could not. */
  unavailableReason: string | null
}

export type ExperimentVerdict =
  | "invalid_split"
  | "not_enough_data"
  | "no_difference_detected"
  | "fsrs_better"
  | "sm2_better"

export interface ExperimentReadout {
  design: ExperimentDesign
  verdict: ExperimentVerdict
  /** One sentence for the banner. Never contains an invented confidence. */
  headline: string
  /** The supporting sentence: interval, n per arm, correction. */
  detail: string
  primary: MetricReadout
  secondary: MetricReadout[]
  sampleRatio: SampleRatioResult
  /** Share of each arm that reviewed at least once in the window. */
  activation: TwoProportionResult | null
  sample: {
    usersControl: number
    usersTreatment: number
    assignedControl: number
    assignedTreatment: number
    minUsersPerArm: number
    /** Users per arm needed to detect the target effect at the declared power. */
    usersNeededPerArm: number | null
    moreUsersNeededControl: number
    moreUsersNeededTreatment: number
    /** Smallest effect the current sample could detect, in Cohen's d. */
    minimumDetectableEffect: number | null
    usersWithMixedAssignment: number
  }
  window: { start: string; end: string; eventsAnalyzed: number; truncated: boolean }
  generatedAt: string
}

export interface ReadoutInput {
  observations: UserObservationSet
  /** Users assigned to each arm, from the profiles collection. */
  assignedControl: number
  assignedTreatment: number
  window: { start: string; end: string; eventsAnalyzed: number; truncated: boolean }
}

// ============================================
// Building the readout
// ============================================

function armValues(observations: UserObservation[], key: MetricKey): number[] {
  const field =
    key === "retention" ? "retentionRate" : key === "score" ? "meanScore" : "intervalAccuracy"
  return metricValues(observations, field)
}

function favouredArm(test: WelchTTestResult | null): "sm2" | "fsrs" | "neither" {
  if (!test || test.meanDifference === 0) return "neither"
  // meanDifference is treatment minus control, i.e. FSRS minus SM-2.
  return test.meanDifference > 0 ? "fsrs" : "sm2"
}

function formatUnit(value: number, unit: MetricUnit): string {
  return unit === "proportion" ? `${(value * 100).toFixed(1)} points` : `${value.toFixed(1)} points`
}

function armName(arm: "sm2" | "fsrs"): string {
  return arm === "fsrs" ? "FSRS" : "SM-2"
}

/**
 * Build the full readout. Pure: everything it needs is passed in, so the whole
 * decision is testable without Firestore.
 */
export function buildExperimentReadout(input: ReadoutInput): ExperimentReadout {
  const { observations, assignedControl, assignedTreatment, window } = input
  const design = EXPERIMENT_DESIGN

  const sampleRatio = checkSampleRatioMismatch(
    assignedControl,
    assignedTreatment,
    design.designedControlShare
  )

  // Run every metric in the family, then correct across the ones that ran.
  const tests = new Map<MetricKey, WelchTTestResult | null>()
  const counts = new Map<MetricKey, { control: number; treatment: number }>()

  for (const key of design.familyMetrics) {
    const control = armValues(observations.sm2, key)
    const treatment = armValues(observations.fsrs, key)
    counts.set(key, { control: control.length, treatment: treatment.length })

    const hasEnough =
      control.length >= design.minUsersPerArm && treatment.length >= design.minUsersPerArm
    tests.set(key, hasEnough ? welchTTest(control, treatment, design.alpha) : null)
  }

  const testedKeys = design.familyMetrics.filter((key) => tests.get(key) != null)
  const adjusted = holmBonferroni(
    testedKeys.map((key) => ({ key, pValue: tests.get(key)!.pValue })),
    design.alpha
  )
  const adjustedByKey = new Map(adjusted.map((entry) => [entry.key, entry]))

  const readouts: MetricReadout[] = design.familyMetrics.map((key) => {
    const test = tests.get(key) ?? null
    const count = counts.get(key)!
    const correction = adjustedByKey.get(key)
    return {
      key,
      label: METRIC_LABELS[key].label,
      description: METRIC_LABELS[key].description,
      unit: METRIC_LABELS[key].unit,
      isPrimary: key === design.primaryMetric,
      nControl: count.control,
      nTreatment: count.treatment,
      test,
      adjustedPValue: correction ? correction.adjustedPValue : null,
      significant: correction ? correction.significant : false,
      favours: favouredArm(test),
      unavailableReason: test
        ? null
        : `Needs ${design.minUsersPerArm} users per arm with this metric recorded. SM-2 has ${count.control}, FSRS has ${count.treatment}.`,
    }
  })

  const primary = readouts.find((readout) => readout.isPrimary)!
  const secondary = readouts.filter((readout) => !readout.isPrimary)

  // Guardrail metric: did assignment to an arm change whether a user shows up
  // at all? A binary per-user outcome, so a two-proportion z-test rather than
  // a t-test. It is reported beside the family, not inside it, because it
  // measures engagement rather than learning.
  const activation =
    assignedControl > 0 && assignedTreatment > 0
      ? twoProportionZTest(
          observations.sm2.length,
          assignedControl,
          observations.fsrs.length,
          assignedTreatment,
          design.alpha
        )
      : null

  const usersNeededPerArm = requiredSampleSizePerArm(
    design.targetEffectSize,
    design.alpha,
    design.power
  )
  const mde = minimumDetectableEffect(
    primary.nControl,
    primary.nTreatment,
    design.alpha,
    design.power
  )

  const verdict = decideVerdict(sampleRatio, primary)
  const { headline, detail } = describeVerdict(verdict, primary, sampleRatio, design)

  return {
    design,
    verdict,
    headline,
    detail,
    primary,
    secondary,
    sampleRatio,
    activation,
    sample: {
      usersControl: observations.sm2.length,
      usersTreatment: observations.fsrs.length,
      assignedControl,
      assignedTreatment,
      minUsersPerArm: design.minUsersPerArm,
      usersNeededPerArm,
      moreUsersNeededControl: Math.max(0, (usersNeededPerArm ?? 0) - primary.nControl),
      moreUsersNeededTreatment: Math.max(0, (usersNeededPerArm ?? 0) - primary.nTreatment),
      minimumDetectableEffect: mde,
      usersWithMixedAssignment: observations.usersWithMixedAssignment,
    },
    window,
    generatedAt: new Date().toISOString(),
  }
}

function decideVerdict(sampleRatio: SampleRatioResult, primary: MetricReadout): ExperimentVerdict {
  // Order matters. A broken split makes every downstream comparison a
  // comparison of two different populations, so it outranks any result.
  if (sampleRatio.mismatch) return "invalid_split"
  if (!primary.test) return "not_enough_data"
  if (!primary.significant) return "no_difference_detected"
  return primary.test.meanDifference > 0 ? "fsrs_better" : "sm2_better"
}

function describeVerdict(
  verdict: ExperimentVerdict,
  primary: MetricReadout,
  sampleRatio: SampleRatioResult,
  design: ExperimentDesign
): { headline: string; detail: string } {
  switch (verdict) {
    case "invalid_split": {
      const observed = (sampleRatio.observedControlShare * 100).toFixed(1)
      const expected = (sampleRatio.expectedControlShare * 100).toFixed(0)
      return {
        headline: "Sample ratio mismatch: this experiment is not valid right now",
        detail: `Assignment sent ${observed}% of users to SM-2 where the design says ${expected}% (${sampleRatio.nControl} vs ${sampleRatio.nTreatment} users, p = ${formatPValue(sampleRatio.pValue)}). Something upstream of the coin flip is filtering users unevenly. Fix that before reading any comparison below.`,
      }
    }

    case "not_enough_data":
      return {
        headline: "Not enough data yet to say which algorithm is better",
        detail: `${primary.label} needs ${design.minUsersPerArm} users per arm before any test is run. SM-2 has ${primary.nControl} and FSRS has ${primary.nTreatment}. No confidence number is shown because there is nothing yet to be confident about.`,
      }

    case "no_difference_detected": {
      const test = primary.test!
      return {
        headline: "No difference detected on the primary metric",
        detail: `${primary.label} differs by ${formatUnit(test.meanDifference, primary.unit)} in favour of ${armName(favouredArm(test) === "sm2" ? "sm2" : "fsrs")}, but the 95% interval runs from ${formatUnit(test.differenceInterval.lower, primary.unit)} to ${formatUnit(test.differenceInterval.upper, primary.unit)} and spans no difference (Holm adjusted p = ${formatPValue(primary.adjustedPValue ?? 1)}, n = ${test.nControl} SM-2 vs ${test.nTreatment} FSRS). This is not evidence the algorithms are equal, only that the current sample cannot separate them.`,
      }
    }

    case "fsrs_better":
    case "sm2_better": {
      const test = primary.test!
      const winner = verdict === "fsrs_better" ? "FSRS" : "SM-2"
      const magnitude = Math.abs(test.meanDifference)
      const low = Math.min(
        Math.abs(test.differenceInterval.lower),
        Math.abs(test.differenceInterval.upper)
      )
      const high = Math.max(
        Math.abs(test.differenceInterval.lower),
        Math.abs(test.differenceInterval.upper)
      )
      return {
        headline: `${winner} is ahead on ${primary.label.toLowerCase()}`,
        detail: `${formatUnit(magnitude, primary.unit)} better, 95% interval ${formatUnit(low, primary.unit)} to ${formatUnit(high, primary.unit)}, Holm adjusted p = ${formatPValue(primary.adjustedPValue ?? test.pValue)} across ${design.familyMetrics.length} metrics, effect size d = ${test.effectSize.d.toFixed(2)} (${test.effectSize.interval.lower.toFixed(2)} to ${test.effectSize.interval.upper.toFixed(2)}), n = ${test.nControl} SM-2 vs ${test.nTreatment} FSRS.`,
      }
    }
  }
}

/** Small p-values are reported as a bound rather than as false precision. */
export function formatPValue(p: number): string {
  if (p < 0.0001) return "< 0.0001"
  return p.toFixed(4)
}
