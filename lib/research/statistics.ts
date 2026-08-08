/**
 * Statistical Analysis Utilities for Spaced Repetition Research
 *
 * Production-grade statistical functions for A/B testing:
 * - T-tests for significance testing
 * - Effect size calculations (Cohen's d)
 * - Confidence intervals
 * - Prediction accuracy metrics (Log Loss, RMSE, Calibration)
 * - Sample size calculations
 *
 * Distribution functions live in `experiment-stats.ts` and are imported here.
 * This file used to carry its own normal CDF and incomplete beta, which meant
 * two implementations of the same p-value could disagree with each other on the
 * same screen. The imported ones are pinned against scipy in tests.
 */

import {
  inverseNormalCdf,
  normalCdf,
  requiredSampleSizePerArm,
  studentTTwoTailedPValue,
} from "./experiment-stats"

// ============================================
// Basic Statistical Functions
// ============================================

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

export function variance(arr: number[], isSample = true): number {
  if (arr.length < 2) return 0
  const avg = mean(arr)
  const sumSq = arr.reduce((sum, x) => sum + Math.pow(x - avg, 2), 0)
  return sumSq / (isSample ? arr.length - 1 : arr.length)
}

export function standardDeviation(arr: number[], isSample = true): number {
  return Math.sqrt(variance(arr, isSample))
}

export function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

// ============================================
// T-Test for Statistical Significance
// ============================================

export interface TTestResult {
  tStatistic: number
  pValue: number
  degreesOfFreedom: number
  significant: boolean
  significanceLevel: number // 0.05, 0.01, or 0.001
  confidenceLevel: number // 95%, 99%, or 99.9%
  meanDifference: number
  standardError: number
  effectSize: number // Cohen's d
  effectSizeInterpretation: "negligible" | "small" | "medium" | "large" | "very large"
  powerAnalysis: {
    observedPower: number
    sampleSizeForPower80: number
    sampleSizeForPower95: number
  }
}

/**
 * Two-sample independent t-test (Welch's t-test)
 * Used for comparing SM-2 vs FSRS metrics.
 *
 * IMPORTANT: pass one value PER USER. The A/B randomizes users, not reviews, so
 * a group array built from review events reports a sample size that the
 * experiment never had. `lib/research/user-observations.ts` does that
 * collapsing; `welchTTest` in `experiment-stats.ts` is the leaner version of
 * this function used by the decision path.
 */
export function tTest(group1: number[], group2: number[], alpha = 0.05): TTestResult {
  const n1 = group1.length
  const n2 = group2.length

  if (n1 < 2 || n2 < 2) {
    return {
      tStatistic: 0,
      pValue: 1,
      degreesOfFreedom: 0,
      significant: false,
      significanceLevel: alpha,
      confidenceLevel: (1 - alpha) * 100,
      meanDifference: 0,
      standardError: 0,
      effectSize: 0,
      effectSizeInterpretation: "negligible",
      powerAnalysis: {
        observedPower: 0,
        sampleSizeForPower80: 100,
        sampleSizeForPower95: 200,
      },
    }
  }

  const mean1 = mean(group1)
  const mean2 = mean(group2)
  const var1 = variance(group1)
  const var2 = variance(group2)

  const meanDiff = mean1 - mean2
  const se1 = var1 / n1
  const se2 = var2 / n2
  const standardError = Math.sqrt(se1 + se2)

  // Handle edge case where variance is 0
  if (standardError === 0) {
    return {
      tStatistic: 0,
      pValue: meanDiff === 0 ? 1 : 0,
      degreesOfFreedom: n1 + n2 - 2,
      significant: meanDiff !== 0,
      significanceLevel: alpha,
      confidenceLevel: (1 - alpha) * 100,
      meanDifference: meanDiff,
      standardError: 0,
      effectSize: 0,
      effectSizeInterpretation: "negligible",
      powerAnalysis: {
        observedPower: meanDiff !== 0 ? 1 : 0,
        sampleSizeForPower80: 10,
        sampleSizeForPower95: 20,
      },
    }
  }

  const tStatistic = meanDiff / standardError

  // Welch-Satterthwaite degrees of freedom
  const df = Math.pow(se1 + se2, 2) / (Math.pow(se1, 2) / (n1 - 1) + Math.pow(se2, 2) / (n2 - 1))

  // Two-tailed p-value from the t distribution (exact via the regularized
  // incomplete beta, not a normal approximation).
  const pValue = studentTTwoTailedPValue(tStatistic, df)

  // Calculate Cohen's d effect size
  const pooledStd = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))
  const effectSize = pooledStd > 0 ? meanDiff / pooledStd : 0
  const effectSizeInterpretation = interpretEffectSize(Math.abs(effectSize))

  // Calculate observed power (approximate)
  const observedPower = calculatePower(Math.abs(effectSize), n1, n2, alpha)

  // Calculate required sample sizes
  const sampleSizeForPower80 = calculateRequiredSampleSize(Math.abs(effectSize), 0.8, alpha)
  const sampleSizeForPower95 = calculateRequiredSampleSize(Math.abs(effectSize), 0.95, alpha)

  // Determine significance level achieved
  let significanceLevel = alpha
  let confidenceLevel = (1 - alpha) * 100
  if (pValue < 0.001) {
    significanceLevel = 0.001
    confidenceLevel = 99.9
  } else if (pValue < 0.01) {
    significanceLevel = 0.01
    confidenceLevel = 99
  } else if (pValue < 0.05) {
    significanceLevel = 0.05
    confidenceLevel = 95
  }

  return {
    tStatistic,
    pValue,
    degreesOfFreedom: df,
    significant: pValue < alpha,
    significanceLevel,
    confidenceLevel,
    meanDifference: meanDiff,
    standardError,
    effectSize,
    effectSizeInterpretation,
    powerAnalysis: {
      observedPower,
      sampleSizeForPower80,
      sampleSizeForPower95,
    },
  }
}

function interpretEffectSize(
  d: number
): "negligible" | "small" | "medium" | "large" | "very large" {
  if (d < 0.2) return "negligible"
  if (d < 0.5) return "small"
  if (d < 0.8) return "medium"
  if (d < 1.2) return "large"
  return "very large"
}

/**
 * Calculate statistical power
 */
function calculatePower(effectSize: number, n1: number, n2: number, alpha: number): number {
  if (effectSize === 0) return alpha // Power equals alpha when effect is 0
  const harmonicN = (2 * n1 * n2) / (n1 + n2)
  const ncp = effectSize * Math.sqrt(harmonicN / 2) // Non-centrality parameter
  // Critical value for the requested alpha rather than a hardcoded 1.96, so a
  // caller asking for a stricter alpha is not quietly given the 0.05 answer.
  const criticalValue = inverseNormalCdf(1 - alpha / 2)
  const power = 1 - normalCdf(criticalValue - ncp) + normalCdf(-criticalValue - ncp)
  return Math.max(0, Math.min(1, power))
}

/**
 * Calculate required sample size per group for desired power.
 * Delegates to the shared implementation so the sample size the page displays
 * and the sample size the decision path uses can never diverge.
 */
function calculateRequiredSampleSize(effectSize: number, power: number, alpha: number): number {
  return requiredSampleSizePerArm(effectSize, alpha, power) ?? Infinity
}

// ============================================
// Prediction Accuracy Metrics
// ============================================

export interface PredictionMetrics {
  logLoss: number
  rmse: number
  mae: number
  accuracy: number
  calibration: CalibrationBin[]
  brierScore: number
  aucRoc: number // Area Under ROC Curve (simplified)
}

export interface CalibrationBin {
  binStart: number
  binEnd: number
  predictedMean: number
  actualMean: number
  count: number
  calibrationError: number // |predicted - actual|
}

/**
 * Calculate Log Loss (Binary Cross-Entropy)
 * Primary metric for FSRS prediction accuracy
 */
export function logLoss(predictions: number[], actuals: boolean[]): number {
  if (predictions.length === 0 || predictions.length !== actuals.length) return 0

  const eps = 1e-15
  let sum = 0

  for (let i = 0; i < predictions.length; i++) {
    const p = Math.max(eps, Math.min(1 - eps, predictions[i]))
    const y = actuals[i] ? 1 : 0
    sum += y * Math.log(p) + (1 - y) * Math.log(1 - p)
  }

  return -sum / predictions.length
}

/**
 * Calculate Root Mean Square Error
 */
export function rmse(predictions: number[], actuals: boolean[]): number {
  if (predictions.length === 0) return 0

  let sumSq = 0
  for (let i = 0; i < predictions.length; i++) {
    const diff = predictions[i] - (actuals[i] ? 1 : 0)
    sumSq += diff * diff
  }

  return Math.sqrt(sumSq / predictions.length)
}

/**
 * Calculate Mean Absolute Error
 */
export function mae(predictions: number[], actuals: boolean[]): number {
  if (predictions.length === 0) return 0

  let sum = 0
  for (let i = 0; i < predictions.length; i++) {
    sum += Math.abs(predictions[i] - (actuals[i] ? 1 : 0))
  }

  return sum / predictions.length
}

/**
 * Calculate Brier Score
 */
export function brierScore(predictions: number[], actuals: boolean[]): number {
  if (predictions.length === 0) return 0

  let sum = 0
  for (let i = 0; i < predictions.length; i++) {
    const diff = predictions[i] - (actuals[i] ? 1 : 0)
    sum += diff * diff
  }

  return sum / predictions.length
}

/**
 * Calculate calibration bins for calibration plot
 */
export function calculateCalibration(
  predictions: number[],
  actuals: boolean[],
  numBins = 10
): CalibrationBin[] {
  if (predictions.length === 0) return []

  const bins: Map<number, { predicted: number[]; actual: boolean[] }> = new Map()

  for (let i = 0; i < predictions.length; i++) {
    const binIndex = Math.min(Math.floor(predictions[i] * numBins), numBins - 1)
    const current = bins.get(binIndex) || { predicted: [], actual: [] }
    current.predicted.push(predictions[i])
    current.actual.push(actuals[i])
    bins.set(binIndex, current)
  }

  return Array.from(bins.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([binIndex, data]) => {
      const predictedMean = mean(data.predicted)
      const actualMean = data.actual.filter((a) => a).length / data.actual.length
      return {
        binStart: binIndex / numBins,
        binEnd: (binIndex + 1) / numBins,
        predictedMean,
        actualMean,
        count: data.predicted.length,
        calibrationError: Math.abs(predictedMean - actualMean),
      }
    })
}

/**
 * Calculate comprehensive prediction metrics
 */
export function calculatePredictionMetrics(
  predictions: number[],
  actuals: boolean[]
): PredictionMetrics {
  if (predictions.length === 0) {
    return {
      logLoss: 0,
      rmse: 0,
      mae: 0,
      accuracy: 0,
      calibration: [],
      brierScore: 0,
      aucRoc: 0.5,
    }
  }

  // Calculate accuracy using 0.5 threshold
  let correct = 0
  for (let i = 0; i < predictions.length; i++) {
    const predicted = predictions[i] >= 0.5
    if (predicted === actuals[i]) correct++
  }
  const accuracy = correct / predictions.length

  return {
    logLoss: logLoss(predictions, actuals),
    rmse: rmse(predictions, actuals),
    mae: mae(predictions, actuals),
    accuracy,
    calibration: calculateCalibration(predictions, actuals),
    brierScore: brierScore(predictions, actuals),
    aucRoc: calculateAUC(predictions, actuals),
  }
}

/**
 * Calculate Area Under ROC Curve (simplified)
 */
function calculateAUC(predictions: number[], actuals: boolean[]): number {
  if (predictions.length === 0) return 0.5

  // Sort by prediction descending
  const sorted = predictions
    .map((p, i) => ({ pred: p, actual: actuals[i] }))
    .sort((a, b) => b.pred - a.pred)

  const positives = sorted.filter((s) => s.actual).length
  const negatives = sorted.length - positives

  if (positives === 0 || negatives === 0) return 0.5

  let auc = 0
  let tpr = 0

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].actual) {
      tpr++
    } else {
      auc += tpr / positives
    }
  }

  return auc / negatives
}

// ============================================
// Confidence Intervals
// ============================================

export interface ConfidenceInterval {
  lower: number
  upper: number
  point: number
  confidenceLevel: number
}

/**
 * Calculate confidence interval for a proportion
 */
export function proportionConfidenceInterval(
  successes: number,
  total: number,
  confidenceLevel = 0.95
): ConfidenceInterval {
  if (total === 0) {
    return { lower: 0, upper: 1, point: 0.5, confidenceLevel }
  }

  const p = successes / total
  const z = confidenceLevel === 0.99 ? 2.576 : confidenceLevel === 0.95 ? 1.96 : 1.645
  const se = Math.sqrt((p * (1 - p)) / total)

  return {
    lower: Math.max(0, p - z * se),
    upper: Math.min(1, p + z * se),
    point: p,
    confidenceLevel,
  }
}

/**
 * Calculate confidence interval for a mean
 */
export function meanConfidenceInterval(data: number[], confidenceLevel = 0.95): ConfidenceInterval {
  if (data.length === 0) {
    return { lower: 0, upper: 0, point: 0, confidenceLevel }
  }

  const m = mean(data)
  const se = standardDeviation(data) / Math.sqrt(data.length)
  const z = confidenceLevel === 0.99 ? 2.576 : confidenceLevel === 0.95 ? 1.96 : 1.645

  return {
    lower: m - z * se,
    upper: m + z * se,
    point: m,
    confidenceLevel,
  }
}

// ============================================
// Sample Size Analysis
// ============================================

export interface SampleSizeAnalysis {
  currentSampleSm2: number
  currentSampleFsrs: number
  totalSample: number
  isSufficient: boolean
  minimumRequired: number
  recommendedForPower80: number
  recommendedForPower95: number
  estimatedDaysToSufficient: number | null // Based on current rate
  powerWithCurrentSample: number
}

/**
 * Analyze sample size sufficiency for the research.
 *
 * NOTE ON THE A/B's STATE: this comment previously asserted that the A/B "was
 * ended and all users now run FSRS". That is not true in production. The switch
 * is an admin action (`end-ab-switch-fsrs`) that has not been run, so the
 * 50/50 assumption below is live, not historical. The authoritative answer is
 * `research_config/algorithm.ab_ended`, read via `getAlgorithmConfig()`; never
 * infer the experiment's state from a comment.
 */
export function analyzeSampleSize(
  sm2Count: number,
  fsrsCount: number,
  dailyNewUsers: number,
  targetEffectSize = 0.3 // Medium effect
): SampleSizeAnalysis {
  const minimumRequired = 30 // Per group for basic statistical validity
  const recommendedForPower80 = calculateRequiredSampleSize(targetEffectSize, 0.8, 0.05)
  const recommendedForPower95 = calculateRequiredSampleSize(targetEffectSize, 0.95, 0.05)

  const isSufficient = sm2Count >= minimumRequired && fsrsCount >= minimumRequired
  const powerWithCurrentSample = calculatePower(targetEffectSize, sm2Count, fsrsCount, 0.05)

  // Estimate days to sufficient sample
  let estimatedDaysToSufficient: number | null = null
  if (!isSufficient && dailyNewUsers > 0) {
    const sm2Needed = Math.max(0, minimumRequired - sm2Count)
    const fsrsNeeded = Math.max(0, minimumRequired - fsrsCount)
    const usersNeeded = Math.max(sm2Needed, fsrsNeeded) * 2 // *2 because 50/50 split
    estimatedDaysToSufficient = Math.ceil(usersNeeded / dailyNewUsers)
  }

  return {
    currentSampleSm2: sm2Count,
    currentSampleFsrs: fsrsCount,
    totalSample: sm2Count + fsrsCount,
    isSufficient,
    minimumRequired,
    recommendedForPower80,
    recommendedForPower95,
    estimatedDaysToSufficient,
    powerWithCurrentSample,
  }
}

// ============================================
// Trend Analysis
// ============================================

export interface TrendAnalysis {
  direction: "improving" | "declining" | "stable"
  slope: number // Daily change
  r2: number // Goodness of fit
  forecast7d: number
  forecast30d: number
}

/**
 * Analyze trend in time-series data using linear regression
 */
export function analyzeTrend(values: number[]): TrendAnalysis {
  if (values.length < 2) {
    return {
      direction: "stable",
      slope: 0,
      r2: 0,
      forecast7d: values[0] || 0,
      forecast30d: values[0] || 0,
    }
  }

  // Simple linear regression: y = mx + b
  const n = values.length
  const xMean = (n - 1) / 2
  const yMean = mean(values)

  let numerator = 0
  let denominator = 0

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean)
    denominator += Math.pow(i - xMean, 2)
  }

  const slope = denominator !== 0 ? numerator / denominator : 0
  const intercept = yMean - slope * xMean

  // Calculate R-squared
  let ssTot = 0
  let ssRes = 0
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept
    ssTot += Math.pow(values[i] - yMean, 2)
    ssRes += Math.pow(values[i] - predicted, 2)
  }
  const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0

  // Forecasts
  const forecast7d = slope * (n + 6) + intercept
  const forecast30d = slope * (n + 29) + intercept

  // Determine direction (threshold: 0.5% daily change)
  const relativeSlope = yMean !== 0 ? slope / yMean : 0
  let direction: "improving" | "declining" | "stable" = "stable"
  if (relativeSlope > 0.005) direction = "improving"
  else if (relativeSlope < -0.005) direction = "declining"

  return {
    direction,
    slope,
    r2,
    forecast7d,
    forecast30d,
  }
}

// ============================================
// Export All
// ============================================

export const StatisticsUtils = {
  mean,
  variance,
  standardDeviation,
  median,
  percentile,
  tTest,
  logLoss,
  rmse,
  mae,
  brierScore,
  calculateCalibration,
  calculatePredictionMetrics,
  proportionConfidenceInterval,
  meanConfidenceInterval,
  analyzeSampleSize,
  analyzeTrend,
}
