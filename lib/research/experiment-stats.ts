/**
 * Frequentist statistics for the SM-2 vs FSRS experiment.
 *
 * WHY THESE TESTS
 *
 * The experiment randomizes ONE USER at a time into one arm and leaves them
 * there. Every function here therefore takes one number (or one success/failure)
 * PER USER, never one per review event. Feeding review events into a t-test
 * inflates n by the average number of reviews per user, treats correlated
 * observations as independent, and drives every p-value toward zero. The unit
 * of analysis has to match the unit of randomization.
 *
 * Given user-level numbers, two tests cover everything the dashboard claims:
 *
 *  - Welch's t-test for continuous per-user metrics (mean score, retention
 *    rate, interval accuracy). Welch rather than Student because the arms have
 *    different user counts AND different variances: one arm can easily contain
 *    the heavier users. Welch does not assume equal variance and costs nothing
 *    when the variances happen to match.
 *  - A two-proportion z-test for binary per-user outcomes (did this user review
 *    at all in the window). The normal approximation is sound at the counts
 *    this dashboard gates on, and the guard below refuses to report when the
 *    expected-count rule is violated.
 *
 * Sample ratio mismatch uses a chi-square goodness-of-fit test with 1 degree of
 * freedom, the standard first check that an experiment is even valid. For 1 df
 * the tail probability is exactly 2 * (1 - PHI(sqrt(x))), so no extra special
 * function is needed.
 *
 * Everything is implemented here rather than pulled from a dependency: the
 * whole surface is three distributions, it must run inside a Next.js route with
 * no native build step, and a hand-checked 200 lines is easier to audit than a
 * stats package. Accuracy is pinned by tests against scipy-computed values.
 */

// ============================================
// Distributions
// ============================================

/**
 * Complementary error function, Numerical Recipes `erfcc`.
 * Fractional error below 1.2e-7 everywhere, which is far tighter than any
 * p-value this dashboard prints.
 */
function erfc(x: number): number {
  const z = Math.abs(x)
  const t = 2 / (2 + z)
  const ty = 4 * t - 2
  const coefficients = [
    -1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2, -9.561514786808631e-3,
    -9.46595344482036e-4, 3.66839497852761e-4, 4.2523324806907e-5, -2.0278578112534e-5,
    -1.624290004647e-6, 1.30365583558e-6, 1.5626441722e-8, -8.5238095915e-8, 6.529054439e-9,
    5.059343495e-9, -9.91364156e-10, -2.27365122e-10, 9.6467911e-11, 2.394038e-12, -6.886027e-12,
    8.94487e-13, 3.13092e-13, -1.12708e-13, 3.81e-16, 7.106e-15,
  ]

  let d = 0
  let dd = 0
  for (let i = coefficients.length - 1; i > 0; i--) {
    const tmp = d
    d = ty * d - dd + coefficients[i]
    dd = tmp
  }
  const ans = t * Math.exp(-z * z + 0.5 * (coefficients[0] + ty * d) - dd)
  return x >= 0 ? ans : 2 - ans
}

/** Standard normal CDF. */
export function normalCdf(x: number): number {
  return 0.5 * erfc(-x / Math.SQRT2)
}

/** Two-tailed p-value for a standard normal test statistic. */
export function normalTwoTailedPValue(z: number): number {
  return clampProbability(erfc(Math.abs(z) / Math.SQRT2))
}

/** Upper tail of a chi-square with 1 degree of freedom. */
export function chiSquare1dfPValue(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return 1
  return clampProbability(erfc(Math.sqrt(x / 2)))
}

function lnGamma(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ]
  let y = x
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  for (let j = 0; j < 6; j++) {
    ser += cof[j] / ++y
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x)
}

/** Continued-fraction expansion for the incomplete beta, evaluated by Lentz's method. */
function betaContinuedFraction(a: number, b: number, x: number): number {
  const MAX_ITERATIONS = 300
  const EPS = 3e-16
  const FPMIN = 1e-300

  const qab = a + b
  const qap = a + 1
  const qam = a - 1

  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d

  for (let m = 1; m <= MAX_ITERATIONS; m++) {
    const m2 = 2 * m

    // Even step.
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c

    // Odd step.
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const delta = d * c
    h *= delta

    if (Math.abs(delta - 1) < EPS) break
  }

  return h
}

/** Regularized incomplete beta function I_x(a, b). */
export function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1

  const front = Math.exp(
    lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  )

  // The continued fraction converges quickly only on one side of the mean;
  // reflect onto the other side when needed.
  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(a, b, x)) / a
    : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b
}

/**
 * Two-tailed p-value for a Student t statistic with (possibly fractional)
 * degrees of freedom: p = I_{df/(df+t^2)}(df/2, 1/2).
 */
export function studentTTwoTailedPValue(t: number, df: number): number {
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) return 1
  const x = df / (df + t * t)
  return clampProbability(regularizedIncompleteBeta(df / 2, 0.5, x))
}

function clampProbability(p: number): number {
  if (!Number.isFinite(p)) return 1
  return Math.min(1, Math.max(0, p))
}

/**
 * Two-tailed critical value of the t distribution, found by bisection on the
 * p-value. Used for confidence intervals, where a fixed 1.96 would be too
 * narrow at the sample sizes this experiment actually has.
 */
export function tCriticalValue(df: number, alpha: number): number {
  if (!Number.isFinite(df) || df <= 0) return NORMAL_CRITICAL_95
  let low = 0
  let high = 100
  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2
    if (studentTTwoTailedPValue(mid, df) > alpha) {
      low = mid
    } else {
      high = mid
    }
  }
  return (low + high) / 2
}

/** z for a two-tailed 95% interval. */
const NORMAL_CRITICAL_95 = 1.959963984540054

// ============================================
// Shared result shapes
// ============================================

export interface Interval {
  lower: number
  upper: number
}

export interface EffectSize {
  /** Cohen's d, positive when the treatment arm scores higher. */
  d: number
  /** Large-sample interval for d (Hedges & Olkin). */
  interval: Interval
  label: "negligible" | "small" | "medium" | "large"
}

export interface WelchTTestResult {
  test: "welch_t"
  nControl: number
  nTreatment: number
  meanControl: number
  meanTreatment: number
  /** treatment minus control, so positive always means "treatment is higher". */
  meanDifference: number
  /** Interval for the difference in means at the requested confidence level. */
  differenceInterval: Interval
  standardError: number
  tStatistic: number
  degreesOfFreedom: number
  pValue: number
  effectSize: EffectSize
  alpha: number
}

export interface TwoProportionResult {
  test: "two_proportion_z"
  nControl: number
  nTreatment: number
  successesControl: number
  successesTreatment: number
  proportionControl: number
  proportionTreatment: number
  /** treatment minus control. */
  difference: number
  differenceInterval: Interval
  zStatistic: number
  pValue: number
  alpha: number
  /**
   * False when any expected cell count is below 5, where the normal
   * approximation stops being trustworthy. Callers must not report the p-value
   * in that case.
   */
  approximationValid: boolean
}

// ============================================
// Tests
// ============================================

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function sampleVariance(values: number[], average: number): number {
  return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1)
}

function labelEffectSize(d: number): EffectSize["label"] {
  const magnitude = Math.abs(d)
  if (magnitude < 0.2) return "negligible"
  if (magnitude < 0.5) return "small"
  if (magnitude < 0.8) return "medium"
  return "large"
}

/**
 * Welch's two-sample t-test on per-user values.
 *
 * Returns null rather than a fabricated zero when either arm has fewer than two
 * users: with n < 2 there is no variance to estimate and no test to run. "We
 * cannot say" is the honest output and callers render it as such.
 */
export function welchTTest(
  control: number[],
  treatment: number[],
  alpha = 0.05
): WelchTTestResult | null {
  const nControl = control.length
  const nTreatment = treatment.length
  if (nControl < 2 || nTreatment < 2) return null

  const meanControl = mean(control)
  const meanTreatment = mean(treatment)
  const varianceControl = sampleVariance(control, meanControl)
  const varianceTreatment = sampleVariance(treatment, meanTreatment)

  const meanDifference = meanTreatment - meanControl
  const seControl = varianceControl / nControl
  const seTreatment = varianceTreatment / nTreatment
  const standardError = Math.sqrt(seControl + seTreatment)

  // Both arms constant: there is no sampling variability to test against, so a
  // p-value would be meaningless. Report the observed difference with a zero
  // width interval and a p-value of 1 (nothing has been demonstrated).
  if (standardError === 0) {
    return {
      test: "welch_t",
      nControl,
      nTreatment,
      meanControl,
      meanTreatment,
      meanDifference,
      differenceInterval: { lower: meanDifference, upper: meanDifference },
      standardError: 0,
      tStatistic: 0,
      degreesOfFreedom: nControl + nTreatment - 2,
      pValue: 1,
      effectSize: { d: 0, interval: { lower: 0, upper: 0 }, label: "negligible" },
      alpha,
    }
  }

  const tStatistic = meanDifference / standardError

  // Welch-Satterthwaite degrees of freedom.
  const degreesOfFreedom =
    (seControl + seTreatment) ** 2 /
    (seControl ** 2 / (nControl - 1) + seTreatment ** 2 / (nTreatment - 1))

  const pValue = studentTTwoTailedPValue(tStatistic, degreesOfFreedom)
  const critical = tCriticalValue(degreesOfFreedom, alpha)

  // Cohen's d against the pooled standard deviation, with the large-sample
  // interval from Hedges & Olkin. Reporting d without its interval hides how
  // little a small sample pins the effect down.
  const pooledStdDev = Math.sqrt(
    ((nControl - 1) * varianceControl + (nTreatment - 1) * varianceTreatment) /
      (nControl + nTreatment - 2)
  )
  const d = pooledStdDev > 0 ? meanDifference / pooledStdDev : 0
  const total = nControl + nTreatment
  const dStandardError = Math.sqrt(total / (nControl * nTreatment) + d ** 2 / (2 * total))

  return {
    test: "welch_t",
    nControl,
    nTreatment,
    meanControl,
    meanTreatment,
    meanDifference,
    differenceInterval: {
      lower: meanDifference - critical * standardError,
      upper: meanDifference + critical * standardError,
    },
    standardError,
    tStatistic,
    degreesOfFreedom,
    pValue,
    effectSize: {
      d,
      interval: {
        lower: d - NORMAL_CRITICAL_95 * dStandardError,
        upper: d + NORMAL_CRITICAL_95 * dStandardError,
      },
      label: labelEffectSize(d),
    },
    alpha,
  }
}

/**
 * Two-proportion z-test for a binary per-user outcome.
 *
 * The test statistic uses the POOLED proportion (the null hypothesis says both
 * arms share one rate) while the interval uses the UNPOOLED standard error
 * (under the alternative the rates differ). Mixing them up is the classic way
 * to publish a significant p-value beside an interval that spans zero.
 */
export function twoProportionZTest(
  successesControl: number,
  nControl: number,
  successesTreatment: number,
  nTreatment: number,
  alpha = 0.05
): TwoProportionResult | null {
  if (nControl < 1 || nTreatment < 1) return null

  const proportionControl = successesControl / nControl
  const proportionTreatment = successesTreatment / nTreatment
  const difference = proportionTreatment - proportionControl

  const pooled = (successesControl + successesTreatment) / (nControl + nTreatment)
  const pooledStandardError = Math.sqrt(pooled * (1 - pooled) * (1 / nControl + 1 / nTreatment))
  const zStatistic = pooledStandardError > 0 ? difference / pooledStandardError : 0
  const pValue = pooledStandardError > 0 ? normalTwoTailedPValue(zStatistic) : 1

  const unpooledStandardError = Math.sqrt(
    (proportionControl * (1 - proportionControl)) / nControl +
      (proportionTreatment * (1 - proportionTreatment)) / nTreatment
  )

  // Normal approximation rule of thumb: every expected cell at least 5.
  const expectedCells = [
    nControl * pooled,
    nControl * (1 - pooled),
    nTreatment * pooled,
    nTreatment * (1 - pooled),
  ]
  const approximationValid = expectedCells.every((cell) => cell >= 5)

  return {
    test: "two_proportion_z",
    nControl,
    nTreatment,
    successesControl,
    successesTreatment,
    proportionControl,
    proportionTreatment,
    difference,
    differenceInterval: {
      lower: difference - NORMAL_CRITICAL_95 * unpooledStandardError,
      upper: difference + NORMAL_CRITICAL_95 * unpooledStandardError,
    },
    zStatistic,
    pValue,
    alpha,
    approximationValid,
  }
}

// ============================================
// Sample ratio mismatch
// ============================================

export interface SampleRatioResult {
  nControl: number
  nTreatment: number
  /** Share of users the assignment mechanism was supposed to send to control. */
  expectedControlShare: number
  observedControlShare: number
  chiSquare: number
  pValue: number
  /**
   * True when the split is too far from the design to be chance. A mismatch
   * invalidates every other number on the page, so it is checked first.
   */
  mismatch: boolean
  /** p-value below which the split is called broken. */
  threshold: number
}

/**
 * The conventional SRM alarm threshold. Deliberately far stricter than 0.05:
 * this check runs on every page load, so a 5% false-alarm rate would cry wolf
 * constantly, while a genuinely broken split produces p-values many orders of
 * magnitude smaller than this.
 */
export const SRM_THRESHOLD = 0.001

/**
 * Chi-square goodness-of-fit test on the assignment counts.
 *
 * Assignment is a bare `Math.random() < 0.5` per user. That is a fine coin, but
 * bugs upstream of the coin (a code path that skips assignment, a migration
 * that rewrites one arm, a filter that drops users unevenly) show up as a split
 * that is not 50/50, and every downstream comparison silently becomes a
 * comparison of two different populations.
 */
export function checkSampleRatioMismatch(
  nControl: number,
  nTreatment: number,
  expectedControlShare = 0.5,
  threshold = SRM_THRESHOLD
): SampleRatioResult {
  const total = nControl + nTreatment

  if (total === 0) {
    return {
      nControl,
      nTreatment,
      expectedControlShare,
      observedControlShare: 0,
      chiSquare: 0,
      pValue: 1,
      mismatch: false,
      threshold,
    }
  }

  const expectedControl = total * expectedControlShare
  const expectedTreatment = total * (1 - expectedControlShare)
  const chiSquare =
    (nControl - expectedControl) ** 2 / expectedControl +
    (nTreatment - expectedTreatment) ** 2 / expectedTreatment
  const pValue = chiSquare1dfPValue(chiSquare)

  return {
    nControl,
    nTreatment,
    expectedControlShare,
    observedControlShare: nControl / total,
    chiSquare,
    pValue,
    mismatch: pValue < threshold,
    threshold,
  }
}

// ============================================
// Multiple comparisons
// ============================================

export interface AdjustedPValue<K extends string = string> {
  key: K
  pValue: number
  adjustedPValue: number
  significant: boolean
}

/**
 * Holm-Bonferroni step-down correction.
 *
 * The dashboard tests three metrics at once. At alpha = 0.05 per test, the
 * chance of at least one false positive across three independent tests is about
 * 14%, so an uncorrected "significant" result on the best-looking metric means
 * much less than it appears. Holm controls the family-wise error rate exactly
 * like Bonferroni but is uniformly more powerful, and needs no independence
 * assumption.
 */
export function holmBonferroni<K extends string>(
  pValues: ReadonlyArray<{ key: K; pValue: number }>,
  alpha = 0.05
): AdjustedPValue<K>[] {
  const count = pValues.length
  if (count === 0) return []

  const ordered = [...pValues].sort((a, b) => a.pValue - b.pValue)

  let runningMax = 0
  const adjustedByKey = new Map<K, number>()
  ordered.forEach((entry, index) => {
    const adjusted = Math.min(1, (count - index) * entry.pValue)
    // Step-down monotonicity: an adjusted p-value can never fall below the
    // adjusted p-value of a smaller raw p-value.
    runningMax = Math.max(runningMax, adjusted)
    adjustedByKey.set(entry.key, runningMax)
  })

  return pValues.map((entry) => {
    const adjustedPValue = adjustedByKey.get(entry.key) ?? 1
    return {
      key: entry.key,
      pValue: entry.pValue,
      adjustedPValue,
      significant: adjustedPValue < alpha,
    }
  })
}

// ============================================
// Design sensitivity
// ============================================

/**
 * The smallest standardized effect (Cohen's d) the current sample could detect
 * with the given power. Computed from the sample the experiment actually has,
 * rather than assumed: an MDE hardcoded at d = 0.3 and never displayed tells
 * the reader nothing about whether a null result means "no effect" or "no data".
 *
 * d_MDE = (z_alpha/2 + z_beta) * sqrt(1/n1 + 1/n2)
 */
export function minimumDetectableEffect(
  nControl: number,
  nTreatment: number,
  alpha = 0.05,
  power = 0.8
): number | null {
  if (nControl < 2 || nTreatment < 2) return null
  const zAlpha = inverseNormalCdf(1 - alpha / 2)
  const zBeta = inverseNormalCdf(power)
  return (zAlpha + zBeta) * Math.sqrt(1 / nControl + 1 / nTreatment)
}

/**
 * Users needed per arm to detect an effect of size d at the given power,
 * assuming equal arms: n = 2 * ((z_alpha/2 + z_beta) / d)^2.
 */
export function requiredSampleSizePerArm(
  effectSize: number,
  alpha = 0.05,
  power = 0.8
): number | null {
  if (!Number.isFinite(effectSize) || effectSize <= 0) return null
  const zAlpha = inverseNormalCdf(1 - alpha / 2)
  const zBeta = inverseNormalCdf(power)
  return Math.ceil(2 * ((zAlpha + zBeta) / effectSize) ** 2)
}

/** Inverse standard normal CDF (Acklam's rational approximation, ~1e-9). */
export function inverseNormalCdf(p: number): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ]
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ]
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]

  const pLow = 0.02425
  const pHigh = 1 - pLow

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    )
  }

  if (p > pHigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p))
    return (
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    )
  }

  const q = p - 0.5
  const r = q * q
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  )
}
