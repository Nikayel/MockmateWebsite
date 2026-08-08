/**
 * Tests for the referral reward state machine.
 *
 * These guard three P0/P1 bugs that all came from the same root cause: the
 * units and the legal transitions were re-derived by hand at each call site
 * instead of being read from one table.
 *
 *  - REV-5/REV-6: the only admin transition is `pending -> redemption_recorded`
 *    and it is refused without a reconcilable reference.
 *  - REV-15: the statuses the service writes are the statuses the UI labels.
 *  - REV-16: a reward's unit comes from its own type, so a $10 cash row can
 *    never render as "10 months" and an unknown type is never guessed.
 */

import { describe, it, expect } from "vitest"

// Pure helpers only, but the module imports firebase-admin at load time.
import { vi } from "vitest"

vi.mock("../firebase-admin", () => ({ adminDb: {} }))
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: vi.fn((n: number) => ({ __increment: n })),
    serverTimestamp: vi.fn(() => "__ts"),
  },
}))
vi.mock("../logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock("nanoid", () => ({ customAlphabet: () => () => "TESTCODE1" }))

import {
  REWARD_TYPES,
  REWARD_STATUSES,
  REWARD_STATUS_LABELS,
  MAX_REDEMPTION_REFERENCE_LENGTH,
  canRecordRedemption,
  describeRewardAmount,
  isLegacyClosedStatus,
  isReferralRewardStatus,
  isReferralRewardType,
  isRewardOpen,
  normalizeRedemptionReference,
  rewardStatusLabel,
  rewardTypeLabel,
} from "../referrals"

describe("reward type mapping", () => {
  it("prices a signup reward in months, not the $10 the admin table used to claim", () => {
    // The signup reward is one free month. Billing it as cash invented a
    // liability the program never promised.
    expect(describeRewardAmount("signup_credit", 1)).toBe("1 free month")
  })

  it("prices a cash reward in dollars even when listed beside credits", () => {
    expect(describeRewardAmount("conversion_cash", 10)).toBe("$10")
  })

  it("pluralises months", () => {
    expect(describeRewardAmount("conversion_credit", 2)).toBe("2 free months")
    expect(describeRewardAmount("conversion_credit", 1)).toBe("1 free month")
  })

  it("refuses to guess a unit for a type the service never writes", () => {
    // `signup_cash` is a phantom type that renders a voided $10 clawback as
    // "10 mo" wherever a unit is assumed from context.
    expect(describeRewardAmount("signup_cash", 10)).toBe("10 (unknown reward type)")
    expect(rewardTypeLabel("signup_cash")).toContain("Unknown reward type")
  })

  it("recognises exactly the three written types", () => {
    expect(REWARD_TYPES).toEqual(["signup_credit", "conversion_cash", "conversion_credit"])
    for (const type of REWARD_TYPES) {
      expect(isReferralRewardType(type)).toBe(true)
      expect(rewardTypeLabel(type)).not.toContain("Unknown")
    }
    expect(isReferralRewardType("signup_cash")).toBe(false)
    expect(isReferralRewardType(undefined)).toBe(false)
  })
})

describe("reward status vocabulary", () => {
  it("labels every status the machine can hold", () => {
    for (const status of REWARD_STATUSES) {
      expect(isReferralRewardStatus(status)).toBe(true)
      expect(REWARD_STATUS_LABELS[status]).toBeTruthy()
    }
  })

  it("treats only pending as an open obligation", () => {
    expect(isRewardOpen("pending")).toBe(true)
    for (const status of REWARD_STATUSES.filter((s) => s !== "pending")) {
      expect(isRewardOpen(status)).toBe(false)
    }
  })

  it("keeps the legacy closed statuses readable but distinguishable", () => {
    // Rows closed by the pre-fix action recorded no reference and delivered
    // nothing, so they must not read like a completed redemption.
    expect(isLegacyClosedStatus("paid")).toBe(true)
    expect(isLegacyClosedStatus("credited")).toBe(true)
    expect(isLegacyClosedStatus("redemption_recorded")).toBe(false)
    expect(REWARD_STATUS_LABELS.paid).not.toBe(REWARD_STATUS_LABELS.redemption_recorded)
  })

  it("has a label for an unrecognised status instead of rendering undefined", () => {
    expect(rewardStatusLabel("nonsense")).toBe("Unknown")
  })
})

describe("redemption references", () => {
  it("trims and keeps a real reference", () => {
    expect(normalizeRedemptionReference("  PAYPAL-8891  ")).toBe("PAYPAL-8891")
  })

  it("rejects blank, whitespace-only and non-string references", () => {
    expect(normalizeRedemptionReference("")).toBeNull()
    expect(normalizeRedemptionReference("   ")).toBeNull()
    expect(normalizeRedemptionReference(undefined)).toBeNull()
    expect(normalizeRedemptionReference(42)).toBeNull()
  })

  it("caps an oversized reference rather than storing it whole", () => {
    const long = "x".repeat(MAX_REDEMPTION_REFERENCE_LENGTH + 50)
    expect(normalizeRedemptionReference(long)).toHaveLength(MAX_REDEMPTION_REFERENCE_LENGTH)
  })
})

describe("canRecordRedemption", () => {
  it("allows the one admin transition: pending -> redemption_recorded", () => {
    const check = canRecordRedemption("pending", " PAYPAL-8891 ")
    expect(check.allowed).toBe(true)
    if (check.allowed) expect(check.reference).toBe("PAYPAL-8891")
  })

  it("refuses without a reference, so the record cannot be pure self-attestation", () => {
    const check = canRecordRedemption("pending", "")
    expect(check.allowed).toBe(false)
    if (!check.allowed) {
      expect(check.code).toBe("missing_reference")
      expect(check.message).toMatch(/reference/i)
    }
  })

  it("refuses to re-record an already recorded redemption", () => {
    const check = canRecordRedemption("redemption_recorded", "PAYPAL-8891")
    expect(check.allowed).toBe(false)
    if (!check.allowed) expect(check.code).toBe("not_pending")
  })

  it("refuses voided and expired rewards", () => {
    for (const status of ["voided", "expired"] as const) {
      const check = canRecordRedemption(status, "PAYPAL-8891")
      expect(check.allowed).toBe(false)
      if (!check.allowed) expect(check.code).toBe("not_pending")
    }
  })

  it("refuses rows the legacy action already closed", () => {
    for (const status of ["paid", "credited"] as const) {
      const check = canRecordRedemption(status, "PAYPAL-8891")
      expect(check.allowed).toBe(false)
      if (!check.allowed) expect(check.code).toBe("not_pending")
    }
  })

  it("reports the missing reference first, so an operator fixes the fixable problem", () => {
    const check = canRecordRedemption("voided", "")
    expect(check.allowed).toBe(false)
    if (!check.allowed) expect(check.code).toBe("missing_reference")
  })
})
