/**
 * Statistics are only worth what their accuracy is worth, so every number here
 * is pinned against an independent reference (scipy 1.17) or a value computed
 * by hand in the comment above the assertion. If one of these fails, the
 * research dashboard is lying to the founder.
 */

import { describe, it, expect } from "vitest"
import {
  normalCdf,
  normalTwoTailedPValue,
  chiSquare1dfPValue,
  studentTTwoTailedPValue,
  tCriticalValue,
  welchTTest,
  twoProportionZTest,
  checkSampleRatioMismatch,
  holmBonferroni,
  minimumDetectableEffect,
  requiredSampleSizePerArm,
  inverseNormalCdf,
  SRM_THRESHOLD,
} from "./experiment-stats"

describe("normal distribution", () => {
  it("matches known standard normal CDF values", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 10)
    expect(normalCdf(1)).toBeCloseTo(0.8413447460685429, 8)
    expect(normalCdf(-1.96)).toBeCloseTo(0.024997895148220435, 8)
    expect(normalCdf(3)).toBeCloseTo(0.9986501019683699, 8)
  })

  it("gives 0.05 two-tailed at the 1.96 critical value", () => {
    expect(normalTwoTailedPValue(1.959963984540054)).toBeCloseTo(0.05, 8)
    expect(normalTwoTailedPValue(0)).toBeCloseTo(1, 10)
  })

  it("inverts itself", () => {
    expect(inverseNormalCdf(0.975)).toBeCloseTo(1.959963984540054, 6)
    expect(inverseNormalCdf(0.8)).toBeCloseTo(0.8416212335729143, 6)
    expect(normalCdf(inverseNormalCdf(0.3))).toBeCloseTo(0.3, 6)
  })
})

describe("student t p-values", () => {
  // scipy: stats.t.sf(t, df) * 2
  it.each([
    { t: 1, df: 10, expected: 0.34089313230206 },
    { t: 3, df: 5, expected: 0.030099247897462576 },
    { t: 0.5, df: 200, expected: 0.6176247523164609 },
    { t: 1.8973665961010275, df: 5.882352941176471, expected: 0.10753119493062724 },
  ])("p(|T| > $t) with df=$df", ({ t, df, expected }) => {
    expect(studentTTwoTailedPValue(t, df)).toBeCloseTo(expected, 8)
  })

  it("is symmetric in the sign of t", () => {
    expect(studentTTwoTailedPValue(-2.4, 17)).toBeCloseTo(studentTTwoTailedPValue(2.4, 17), 12)
  })

  it("returns 0.05 at the tabulated two-tailed critical values", () => {
    // t(0.975, 10) = 2.228139, t(0.975, 18) = 2.100922
    expect(studentTTwoTailedPValue(2.228139, 10)).toBeCloseTo(0.05, 5)
    expect(studentTTwoTailedPValue(2.100922, 18)).toBeCloseTo(0.05, 5)
  })

  it("approaches the normal for large df", () => {
    expect(studentTTwoTailedPValue(1.959963984540054, 1e7)).toBeCloseTo(0.05, 5)
  })

  it("recovers the tabulated critical value from the p-value", () => {
    // scipy: stats.t.ppf(0.975, 5.882352941) = 2.458823709717447
    expect(tCriticalValue(5.882352941176471, 0.05)).toBeCloseTo(2.458823709717447, 6)
    expect(tCriticalValue(10, 0.05)).toBeCloseTo(2.228138851986273, 6)
  })
})

describe("welchTTest", () => {
  // control = [1,2,3,4,5]  mean 3, sample variance 2.5
  // treatment = [2,4,6,8,10] mean 6, sample variance 10
  // diff = +3, se = sqrt(2.5/5 + 10/5) = sqrt(2.5) = 1.5811388
  // t = 1.8973666, Welch df = 2.5^2 / (0.5^2/4 + 2^2/4) = 5.8823529
  // scipy ttest_ind(equal_var=False) => t=1.8973665961, p=0.10753119493
  const control = [1, 2, 3, 4, 5]
  const treatment = [2, 4, 6, 8, 10]

  it("reproduces scipy's Welch statistic, df and p-value", () => {
    const result = welchTTest(control, treatment)!
    expect(result.tStatistic).toBeCloseTo(1.8973665961010275, 10)
    expect(result.degreesOfFreedom).toBeCloseTo(5.882352941176471, 10)
    expect(result.pValue).toBeCloseTo(0.10753119493062724, 8)
    expect(result.meanDifference).toBeCloseTo(3, 12)
    expect(result.standardError).toBeCloseTo(1.5811388300841898, 10)
  })

  it("builds the difference interval from the t critical value, not 1.96", () => {
    const result = welchTTest(control, treatment)!
    // 3 +/- 2.458823709717447 * 1.5811388300841898 = 3 +/- 3.8877416
    expect(result.differenceInterval.lower).toBeCloseTo(-0.8877416437659114, 8)
    expect(result.differenceInterval.upper).toBeCloseTo(6.887741643765912, 8)
    // p > 0.05 and the interval contains zero: the two must never disagree.
    expect(result.differenceInterval.lower).toBeLessThan(0)
  })

  it("reports Cohen's d with an interval", () => {
    const result = welchTTest(control, treatment)!
    // pooled sd = sqrt((4*2.5 + 4*10)/8) = 2.5, d = 3/2.5 = 1.2
    expect(result.effectSize.d).toBeCloseTo(1.2, 10)
    expect(result.effectSize.label).toBe("large")
    // se_d = sqrt(10/25 + 1.44/20) = 0.6870225614927068, d +/- 1.959964*se_d
    expect(result.effectSize.interval.lower).toBeCloseTo(-0.14653947709215998, 8)
    expect(result.effectSize.interval.upper).toBeCloseTo(2.5465394770921597, 8)
  })

  it("orients the difference as treatment minus control", () => {
    const flipped = welchTTest(treatment, control)!
    expect(flipped.meanDifference).toBeCloseTo(-3, 12)
    expect(flipped.effectSize.d).toBeCloseTo(-1.2, 10)
    expect(flipped.pValue).toBeCloseTo(0.10753119493062724, 8)
  })

  it("detects a real difference at realistic user counts", () => {
    // 60 users per arm, a clean one standard deviation apart.
    const a = Array.from({ length: 60 }, (_, i) => (i % 10) / 10)
    const b = a.map((value) => value + 1)
    const result = welchTTest(a, b)!
    expect(result.pValue).toBeLessThan(1e-10)
    expect(result.differenceInterval.lower).toBeGreaterThan(0)
  })

  it("returns null instead of a fake zero when an arm has fewer than two users", () => {
    expect(welchTTest([], [1, 2, 3])).toBeNull()
    expect(welchTTest([1], [1, 2, 3])).toBeNull()
    expect(welchTTest([1, 2], [3, 4])).not.toBeNull()
  })

  it("never claims significance when both arms are constant", () => {
    const result = welchTTest([5, 5, 5], [7, 7, 7])!
    expect(result.pValue).toBe(1)
    expect(result.effectSize.d).toBe(0)
  })
})

describe("twoProportionZTest", () => {
  // 30/100 control vs 40/100 treatment
  // pooled = 0.35, se = sqrt(0.35*0.65*0.02) = 0.0674537, z = 1.4824986
  it("matches the hand-computed z and p", () => {
    const result = twoProportionZTest(30, 100, 40, 100)!
    expect(result.zStatistic).toBeCloseTo(1.4824986333222028, 10)
    expect(result.pValue).toBeCloseTo(0.13820766697402576, 8)
    expect(result.difference).toBeCloseTo(0.1, 12)
  })

  it("uses the unpooled standard error for the interval", () => {
    const result = twoProportionZTest(30, 100, 40, 100)!
    // se_unpooled = sqrt(0.21/100 + 0.24/100) = 0.0670820
    expect(result.differenceInterval.lower).toBeCloseTo(-0.031478381086487234, 8)
    expect(result.differenceInterval.upper).toBeCloseTo(0.23147838108648724, 8)
  })

  it("flags the normal approximation as invalid on tiny expected counts", () => {
    expect(twoProportionZTest(1, 6, 2, 6)!.approximationValid).toBe(false)
    expect(twoProportionZTest(30, 100, 40, 100)!.approximationValid).toBe(true)
  })

  it("returns null with an empty arm", () => {
    expect(twoProportionZTest(0, 0, 3, 10)).toBeNull()
  })
})

describe("checkSampleRatioMismatch", () => {
  it("passes a clean 50/50 split", () => {
    const result = checkSampleRatioMismatch(500, 500)
    expect(result.chiSquare).toBeCloseTo(0, 12)
    expect(result.pValue).toBeCloseTo(1, 10)
    expect(result.mismatch).toBe(false)
  })

  it("flags a broken split", () => {
    // chi2 = 100^2/1100 * 2 = 18.1818, scipy chisquare p = 2.007865612e-05
    const result = checkSampleRatioMismatch(1000, 1200)
    expect(result.chiSquare).toBeCloseTo(18.181818181818183, 10)
    expect(result.pValue).toBeCloseTo(2.007865612426483e-5, 12)
    expect(result.mismatch).toBe(true)
    expect(result.observedControlShare).toBeCloseTo(1000 / 2200, 10)
  })

  it("tolerates the ordinary jitter of a fair coin", () => {
    // 520/480 out of 1000 is a completely normal coin-flip outcome.
    const result = checkSampleRatioMismatch(520, 480)
    expect(result.pValue).toBeGreaterThan(SRM_THRESHOLD)
    expect(result.mismatch).toBe(false)
  })

  it("honours a non-even designed split", () => {
    const result = checkSampleRatioMismatch(300, 700, 0.3)
    expect(result.chiSquare).toBeCloseTo(0, 12)
    expect(result.mismatch).toBe(false)
  })

  it("says nothing when there are no users", () => {
    const result = checkSampleRatioMismatch(0, 0)
    expect(result.pValue).toBe(1)
    expect(result.mismatch).toBe(false)
  })
})

describe("holmBonferroni", () => {
  it("applies the step-down ladder and keeps adjusted p-values monotone", () => {
    // sorted: 0.01 * 3 = 0.03 | 0.03 * 2 = 0.06 | 0.04 * 1 = 0.04 -> raised to 0.06
    const adjusted = holmBonferroni([
      { key: "retention", pValue: 0.01 },
      { key: "score", pValue: 0.04 },
      { key: "accuracy", pValue: 0.03 },
    ])
    const byKey = Object.fromEntries(adjusted.map((entry) => [entry.key, entry]))
    expect(byKey.retention.adjustedPValue).toBeCloseTo(0.03, 12)
    expect(byKey.accuracy.adjustedPValue).toBeCloseTo(0.06, 12)
    expect(byKey.score.adjustedPValue).toBeCloseTo(0.06, 12)
    expect(byKey.retention.significant).toBe(true)
    expect(byKey.score.significant).toBe(false)
  })

  it("turns a marginal single-test win into a non-result across three tests", () => {
    const adjusted = holmBonferroni([
      { key: "a", pValue: 0.03 },
      { key: "b", pValue: 0.5 },
      { key: "c", pValue: 0.9 },
    ])
    expect(adjusted.find((entry) => entry.key === "a")!.adjustedPValue).toBeCloseTo(0.09, 12)
    expect(adjusted.find((entry) => entry.key === "a")!.significant).toBe(false)
  })

  it("caps adjusted p-values at 1 and preserves input order", () => {
    const adjusted = holmBonferroni([
      { key: "x", pValue: 0.9 },
      { key: "y", pValue: 0.8 },
    ])
    expect(adjusted.map((entry) => entry.key)).toEqual(["x", "y"])
    expect(adjusted.every((entry) => entry.adjustedPValue <= 1)).toBe(true)
  })

  it("returns an empty family unchanged", () => {
    expect(holmBonferroni([])).toEqual([])
  })
})

describe("design sensitivity", () => {
  it("computes the MDE from the sample actually collected", () => {
    // (1.959964 + 0.841621) * sqrt(2/100) = 0.3962040
    expect(minimumDetectableEffect(100, 100)).toBeCloseTo(0.39620398115993455, 8)
    // Smaller sample can only detect a bigger effect.
    expect(minimumDetectableEffect(30, 30)!).toBeGreaterThan(minimumDetectableEffect(100, 100)!)
  })

  it("has no MDE to report without a sample", () => {
    expect(minimumDetectableEffect(1, 40)).toBeNull()
  })

  it("computes users needed per arm for a target effect", () => {
    // 2 * (2.801585 / 0.3)^2 = 174.42 -> 175
    expect(requiredSampleSizePerArm(0.3)).toBe(175)
    expect(requiredSampleSizePerArm(0.8)).toBe(25)
    expect(requiredSampleSizePerArm(0)).toBeNull()
  })
})

describe("chi-square with one degree of freedom", () => {
  it("matches the closed form 2 * (1 - PHI(sqrt(x)))", () => {
    expect(chiSquare1dfPValue(3.841458820694124)).toBeCloseTo(0.05, 8)
    expect(chiSquare1dfPValue(0)).toBe(1)
    expect(chiSquare1dfPValue(10.827566)).toBeCloseTo(0.001, 6)
  })
})
