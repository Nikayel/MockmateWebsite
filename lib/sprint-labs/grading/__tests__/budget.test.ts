/**
 * Tests for the per-ticket submission budget + cooldown state machine
 * (docs/sprint-labs/WORKBOOK-SPEC.md §5 rule: "Per-ticket submission
 * budget, cooldown, and fixed-latency reporting, to close the oracle and
 * timing channels"). Pure: takes the count of prior attempts + the most
 * recent one's timestamp + "now", returns an allow/deny decision. No
 * Firestore, no clock reads beyond the `now` it is given.
 */

import { describe, expect, it } from "vitest"
import {
  checkSubmissionBudget,
  SPRINT_LAB_SUBMISSION_BUDGET,
  SPRINT_LAB_SUBMISSION_COOLDOWN_SECONDS,
} from "../budget"

const NOW = new Date("2026-08-26T12:00:00.000Z")

function secondsBefore(now: Date, seconds: number): string {
  return new Date(now.getTime() - seconds * 1000).toISOString()
}

describe("checkSubmissionBudget", () => {
  it("allows the first attempt (zero prior attempts, no cooldown to check)", () => {
    const result = checkSubmissionBudget({
      priorAttemptCount: 0,
      mostRecentSubmittedAt: null,
      now: NOW,
    })
    expect(result).toEqual({ allowed: true })
  })

  it("allows an attempt below the budget once the cooldown has elapsed", () => {
    const result = checkSubmissionBudget({
      priorAttemptCount: SPRINT_LAB_SUBMISSION_BUDGET - 1,
      mostRecentSubmittedAt: secondsBefore(NOW, SPRINT_LAB_SUBMISSION_COOLDOWN_SECONDS + 1),
      now: NOW,
    })
    expect(result).toEqual({ allowed: true })
  })

  it("denies with BUDGET_EXCEEDED once priorAttemptCount reaches the budget", () => {
    const result = checkSubmissionBudget({
      priorAttemptCount: SPRINT_LAB_SUBMISSION_BUDGET,
      mostRecentSubmittedAt: secondsBefore(NOW, SPRINT_LAB_SUBMISSION_COOLDOWN_SECONDS + 100),
      now: NOW,
    })
    expect(result).toEqual({ allowed: false, reason: "BUDGET_EXCEEDED" })
  })

  it("denies with BUDGET_EXCEEDED when priorAttemptCount is past the budget", () => {
    const result = checkSubmissionBudget({
      priorAttemptCount: SPRINT_LAB_SUBMISSION_BUDGET + 3,
      mostRecentSubmittedAt: null,
      now: NOW,
    })
    expect(result.allowed).toBe(false)
    expect((result as { reason: string }).reason).toBe("BUDGET_EXCEEDED")
  })

  it("denies with COOLDOWN_ACTIVE when the most recent attempt is inside the cooldown window", () => {
    const result = checkSubmissionBudget({
      priorAttemptCount: 1,
      mostRecentSubmittedAt: secondsBefore(NOW, 10),
      now: NOW,
    })
    expect(result).toEqual({
      allowed: false,
      reason: "COOLDOWN_ACTIVE",
      retryAfterSeconds: SPRINT_LAB_SUBMISSION_COOLDOWN_SECONDS - 10,
    })
  })

  it("allows exactly at the cooldown boundary (elapsed === cooldown)", () => {
    const result = checkSubmissionBudget({
      priorAttemptCount: 1,
      mostRecentSubmittedAt: secondsBefore(NOW, SPRINT_LAB_SUBMISSION_COOLDOWN_SECONDS),
      now: NOW,
    })
    expect(result).toEqual({ allowed: true })
  })

  it("checks BUDGET before COOLDOWN: an exhausted budget reports BUDGET_EXCEEDED even mid-cooldown", () => {
    const result = checkSubmissionBudget({
      priorAttemptCount: SPRINT_LAB_SUBMISSION_BUDGET,
      mostRecentSubmittedAt: secondsBefore(NOW, 1),
      now: NOW,
    })
    expect(result).toEqual({ allowed: false, reason: "BUDGET_EXCEEDED" })
  })

  it("treats a null mostRecentSubmittedAt as no cooldown in effect, regardless of priorAttemptCount", () => {
    const result = checkSubmissionBudget({
      priorAttemptCount: 2,
      mostRecentSubmittedAt: null,
      now: NOW,
    })
    expect(result).toEqual({ allowed: true })
  })

  it("rounds retryAfterSeconds up so a caller never tells the client to retry a moment too early", () => {
    const result = checkSubmissionBudget({
      priorAttemptCount: 1,
      mostRecentSubmittedAt: secondsBefore(NOW, 10.4),
      now: NOW,
    })
    expect(result.allowed).toBe(false)
    expect((result as { retryAfterSeconds: number }).retryAfterSeconds).toBe(
      Math.ceil(SPRINT_LAB_SUBMISSION_COOLDOWN_SECONDS - 10.4)
    )
  })
})
