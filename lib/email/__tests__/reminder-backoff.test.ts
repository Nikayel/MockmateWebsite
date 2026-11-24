import { describe, expect, it } from "vitest"
import {
  evaluateSpacedRepetitionBackoff,
  MAX_UNANSWERED_SPACED_REPETITION_REMINDERS,
  resolveLastPracticeActivityAt,
  SPACED_REPETITION_BACKOFF_WAIT_DAYS,
  SPACED_REPETITION_LOOKBACK_DAYS,
  SPACED_REPETITION_MAX_INACTIVE_DAYS,
} from "../reminder-backoff"

const DAY_MS = 24 * 60 * 60 * 1000
const BASE = Date.parse("2026-11-01T12:00:00.000Z")
const atDay = (day: number, extraHours = 0) =>
  new Date(BASE + day * DAY_MS + extraHours * 60 * 60 * 1000)

describe("evaluateSpacedRepetitionBackoff", () => {
  it("keeps the lookback window wider than both dormancy and the full backoff arc", () => {
    const totalArcDays = SPACED_REPETITION_BACKOFF_WAIT_DAYS.reduce((sum, d) => sum + d, 0)
    expect(SPACED_REPETITION_LOOKBACK_DAYS).toBeGreaterThan(SPACED_REPETITION_MAX_INACTIVE_DAYS)
    expect(SPACED_REPETITION_LOOKBACK_DAYS).toBeGreaterThan(totalArcDays)
  })

  it("allows reminder #1 immediately when due for an active user", () => {
    const decision = evaluateSpacedRepetitionBackoff({
      now: atDay(2),
      lastActivityAt: atDay(0),
      recentSendTimestamps: [],
    })

    expect(decision).toEqual({
      allowed: true,
      attemptNumber: 1,
      unansweredSends: 0,
    })
  })

  it("enforces exponential backoff across unanswered reminders (3d -> 7d -> 14d -> stop)", () => {
    const activity = atDay(0)
    const send1 = atDay(1)

    // Day 2 & 3: blocked by 3-day backoff after send #1
    expect(
      evaluateSpacedRepetitionBackoff({
        now: atDay(2),
        lastActivityAt: activity,
        recentSendTimestamps: [send1],
      })
    ).toMatchObject({ allowed: false, reason: "backoff_active", unansweredSends: 1 })

    expect(
      evaluateSpacedRepetitionBackoff({
        now: atDay(3, 23),
        lastActivityAt: activity,
        recentSendTimestamps: [send1],
      })
    ).toMatchObject({ allowed: false, reason: "backoff_active", unansweredSends: 1 })

    // Day 4 (3 days after send #1): send #2 allowed
    const send2 = atDay(4)
    expect(
      evaluateSpacedRepetitionBackoff({
        now: send2,
        lastActivityAt: activity,
        recentSendTimestamps: [send1],
      })
    ).toEqual({ allowed: true, attemptNumber: 2, unansweredSends: 1 })

    // Day 10 (6 days after send #2): blocked by 7-day backoff
    expect(
      evaluateSpacedRepetitionBackoff({
        now: atDay(10),
        lastActivityAt: activity,
        recentSendTimestamps: [send1, send2],
      })
    ).toMatchObject({ allowed: false, reason: "backoff_active", unansweredSends: 2 })

    // Day 11 (7 days after send #2): send #3 allowed
    const send3 = atDay(11)
    expect(
      evaluateSpacedRepetitionBackoff({
        now: send3,
        lastActivityAt: activity,
        recentSendTimestamps: [send1, send2],
      })
    ).toEqual({ allowed: true, attemptNumber: 3, unansweredSends: 2 })

    // Day 24 (13 days after send #3): blocked by 14-day backoff
    expect(
      evaluateSpacedRepetitionBackoff({
        now: atDay(24),
        lastActivityAt: activity,
        recentSendTimestamps: [send1, send2, send3],
      })
    ).toMatchObject({ allowed: false, reason: "backoff_active", unansweredSends: 3 })

    // Day 25 (14 days after send #3): send #4 allowed
    const send4 = atDay(25)
    expect(
      evaluateSpacedRepetitionBackoff({
        now: send4,
        lastActivityAt: activity,
        recentSendTimestamps: [send1, send2, send3],
      })
    ).toEqual({ allowed: true, attemptNumber: 4, unansweredSends: 3 })

    // Day 29 (after 4 unanswered reminders): paused until user returns
    expect(
      evaluateSpacedRepetitionBackoff({
        now: atDay(29),
        lastActivityAt: activity,
        recentSendTimestamps: [send1, send2, send3, send4],
      })
    ).toEqual({
      allowed: false,
      reason: "max_unanswered_reminders",
      unansweredSends: MAX_UNANSWERED_SPACED_REPETITION_REMINDERS,
    })
  })

  it("resets backoff when the user returns and practices again, while preserving 24h min gap", () => {
    const oldSends = [atDay(1), atDay(4), atDay(11), atDay(25)]
    const returnedOnDay26 = atDay(26)

    // Still within 24h of day-25 send -> blocked by recent_send
    expect(
      evaluateSpacedRepetitionBackoff({
        now: atDay(25, 20),
        lastActivityAt: atDay(25, 18),
        recentSendTimestamps: oldSends,
      })
    ).toMatchObject({ allowed: false, reason: "recent_send", unansweredSends: 0 })

    // Next day after returning -> reset to attempt #1
    expect(
      evaluateSpacedRepetitionBackoff({
        now: atDay(27),
        lastActivityAt: returnedOnDay26,
        recentSendTimestamps: oldSends,
      })
    ).toEqual({ allowed: true, attemptNumber: 1, unansweredSends: 0 })
  })

  it("stops emailing dormant accounts (>30d inactive) even with an empty send history", () => {
    const decision = evaluateSpacedRepetitionBackoff({
      now: atDay(60),
      lastActivityAt: atDay(0),
      recentSendTimestamps: [],
    })

    expect(decision).toEqual({
      allowed: false,
      reason: "dormant_account",
      unansweredSends: 0,
    })
  })

  it("ignores malformed timestamps safely and still caps unanswered sends when lastActivityAt is missing", () => {
    const decision = evaluateSpacedRepetitionBackoff({
      now: atDay(20),
      lastActivityAt: "not-a-date",
      recentSendTimestamps: ["bad", atDay(1), atDay(4), atDay(8), atDay(12)],
    })

    expect(decision).toEqual({
      allowed: false,
      reason: "max_unanswered_reminders",
      unansweredSends: 4,
    })
  })
})

describe("resolveLastPracticeActivityAt", () => {
  it("prefers the newest timestamp across last_session_at and topic last_practiced_at", () => {
    expect(
      resolveLastPracticeActivityAt({
        last_session_at: atDay(5).toISOString(),
        updated_at: atDay(10).toISOString(),
        topics: {
          a: { last_practiced_at: atDay(2).toISOString() },
          b: { last_practiced_at: atDay(7).toISOString() },
        },
      })
    ).toBe(atDay(7).toISOString())
  })

  it("falls back to updated_at when neither last_session_at nor topic timestamps exist", () => {
    expect(
      resolveLastPracticeActivityAt({
        updated_at: atDay(3).toISOString(),
        topics: {},
      })
    ).toBe(atDay(3).toISOString())
  })
})
