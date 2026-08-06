import { describe, it, expect } from "vitest"
import {
  resolveBudgetCap,
  resolveTier,
  hasBudgetOverride,
  budgetUsedPercent,
  MAX_CUSTOM_BUDGET_CAP,
} from "../budget"
import { AI_BUDGET_CAPS } from "../../pricing"

/**
 * Regression guard: the admin "Set Budget" action wrote custom_budget_cap and
 * nothing read it, so raising a user's budget produced a success toast and no
 * behaviour change. Enforcement and display both indexed AI_BUDGET_CAPS by tier.
 */

describe("resolveTier", () => {
  it("reads the tier from the profile", () => {
    expect(resolveTier({ subscription_tier: "pro" })).toBe("pro")
    expect(resolveTier({ subscription_tier: "enterprise" })).toBe("enterprise")
  })

  it("defaults to free for missing, unknown or non-string values", () => {
    expect(resolveTier(undefined)).toBe("free")
    expect(resolveTier({})).toBe("free")
    expect(resolveTier({ subscription_tier: "platinum" })).toBe("free")
    expect(resolveTier({ subscription_tier: 7 })).toBe("free")
  })
})

describe("resolveBudgetCap", () => {
  it("falls back to the tier cap when no override is set", () => {
    expect(resolveBudgetCap({ subscription_tier: "free" })).toBe(AI_BUDGET_CAPS.free)
    expect(resolveBudgetCap({ subscription_tier: "pro" })).toBe(AI_BUDGET_CAPS.pro)
    expect(resolveBudgetCap(undefined)).toBe(AI_BUDGET_CAPS.free)
  })

  it("honours an admin override, which is the bug this exists to prevent", () => {
    expect(resolveBudgetCap({ subscription_tier: "free", custom_budget_cap: 50 })).toBe(50)
  })

  it("lets an override lower a cap as well as raise it", () => {
    expect(resolveBudgetCap({ subscription_tier: "enterprise", custom_budget_cap: 1 })).toBe(1)
  })

  it("treats a zero override as meaningful rather than absent", () => {
    // 0 blocks all spend; falling through to the tier cap would silently
    // ignore an admin deliberately freezing an abusive account.
    expect(resolveBudgetCap({ subscription_tier: "pro", custom_budget_cap: 0 })).toBe(0)
  })

  it("ignores overrides that are negative, non-finite, or not numbers", () => {
    const tierCap = AI_BUDGET_CAPS.pro
    expect(resolveBudgetCap({ subscription_tier: "pro", custom_budget_cap: -5 })).toBe(tierCap)
    expect(resolveBudgetCap({ subscription_tier: "pro", custom_budget_cap: NaN })).toBe(tierCap)
    expect(resolveBudgetCap({ subscription_tier: "pro", custom_budget_cap: Infinity })).toBe(
      tierCap
    )
    expect(resolveBudgetCap({ subscription_tier: "pro", custom_budget_cap: "100" })).toBe(tierCap)
  })

  it("refuses an override above the ceiling, so a stale write cannot uncap an account", () => {
    expect(
      resolveBudgetCap({ subscription_tier: "free", custom_budget_cap: MAX_CUSTOM_BUDGET_CAP + 1 })
    ).toBe(AI_BUDGET_CAPS.free)
    expect(
      resolveBudgetCap({ subscription_tier: "free", custom_budget_cap: MAX_CUSTOM_BUDGET_CAP })
    ).toBe(MAX_CUSTOM_BUDGET_CAP)
  })
})

describe("hasBudgetOverride", () => {
  it("reports whether the cap came from an override or the tier", () => {
    expect(hasBudgetOverride({ custom_budget_cap: 25 })).toBe(true)
    expect(hasBudgetOverride({ custom_budget_cap: 0 })).toBe(true)
    expect(hasBudgetOverride({ subscription_tier: "pro" })).toBe(false)
    expect(hasBudgetOverride({ custom_budget_cap: -1 })).toBe(false)
    expect(hasBudgetOverride(undefined)).toBe(false)
  })
})

describe("budgetUsedPercent", () => {
  it("reports the share of the cap consumed", () => {
    expect(budgetUsedPercent(5, 20)).toBe(25)
    expect(budgetUsedPercent(20, 20)).toBe(100)
  })

  it("does not divide by zero when the cap is zero", () => {
    // The old inline (cost / cap) * 100 produced NaN here, which rendered as
    // "NaN%" in the admin table and broke every sort that touched the column.
    expect(budgetUsedPercent(1, 0)).toBe(100)
    expect(budgetUsedPercent(0, 0)).toBe(0)
    expect(Number.isNaN(budgetUsedPercent(1, 0))).toBe(false)
  })
})
