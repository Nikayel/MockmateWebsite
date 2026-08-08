/**
 * The facts that say whether this experiment can be read yet.
 *
 * This replaces a "Research Quality Score /100". That score summed a
 * hand-assigned point ladder (15 for clearing the minimum sample, 5 more at 100
 * users, 25 for landing in a power band) and stamped a verdict on the total:
 * "Research-grade quality - results are highly reliable". No arithmetic in that
 * file could support the claim, because nothing validated the weights.
 *
 * Worse, one of its terms was `consistencyScore += 10` whenever any test came
 * back significant, so finding a significant result raised the reported quality
 * of the experiment that found it. That is the same shape as the
 * `60 + wins * 7` "confidence" this dashboard already deleted.
 *
 * What is reported instead is the set of numbers the score was pretending to
 * compress. Each one is computed elsewhere, means something on its own, and can
 * be checked by a reader: users per arm, the sample the design asks for and
 * whether it has been reached, the power the current sample actually buys, the
 * sample ratio check, and how many of the declared metrics could be tested.
 * There is deliberately no total, because a total would need weights and there
 * are no defensible weights to use.
 */

import type { ExperimentReadout } from "./experiment-readout"
import type { SampleSizeAnalysis } from "./statistics"

export interface ExperimentReadiness {
  /** Users contributing observations in the window, per arm. */
  usersControl: number
  usersTreatment: number
  /** Users per arm the design needs to detect its target effect at its power. */
  requiredUsersPerArm: number | null
  /** True only when both arms have reached `requiredUsersPerArm`. */
  meetsRequiredSample: boolean
  /** Power the sample collected so far actually buys, 0 to 1. */
  powerAtCurrentSample: number
  /** Sample ratio mismatch: true means assignment is broken and nothing below it holds. */
  sampleRatioMismatch: boolean
  sampleRatioPValue: number
  observedControlShare: number
  expectedControlShare: number
  /** Metrics the design declared in its family. */
  declaredTests: number
  /** Of those, how many had enough users in both arms to actually run. */
  testsRun: number
}

export function summarizeReadiness(
  readout: ExperimentReadout,
  sampleAnalysis: SampleSizeAnalysis
): ExperimentReadiness {
  const { sample, sampleRatio, design } = readout

  // `moreUsersNeeded*` is only meaningful once the required sample is known;
  // when it is null both fields read 0 and would otherwise fake a met target.
  const meetsRequiredSample =
    sample.usersNeededPerArm !== null &&
    sample.moreUsersNeededControl === 0 &&
    sample.moreUsersNeededTreatment === 0

  const testsRun = [readout.primary, ...readout.secondary].filter(
    (metric) => metric.test !== null
  ).length

  return {
    usersControl: sample.usersControl,
    usersTreatment: sample.usersTreatment,
    requiredUsersPerArm: sample.usersNeededPerArm,
    meetsRequiredSample,
    powerAtCurrentSample: sampleAnalysis.powerWithCurrentSample,
    sampleRatioMismatch: sampleRatio.mismatch,
    sampleRatioPValue: sampleRatio.pValue,
    observedControlShare: sampleRatio.observedControlShare,
    expectedControlShare: sampleRatio.expectedControlShare,
    declaredTests: design.familyMetrics.length,
    testsRun,
  }
}
