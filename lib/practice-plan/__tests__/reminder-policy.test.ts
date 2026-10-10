import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Profile } from "@/lib/types"
import type { PracticePlan } from "../schema"
import { reminderDeliveryState, reminderEligibility } from "../reminder-policy"
const plan = { savedAt: "2026-10-10T09:00:00.000Z", timezone: "UTC", attempts: 1 } as PracticePlan
const profile = { email: "fixture@example.com", notification_preferences: {} } as Profile
const now = new Date("2026-10-10T10:00:00.000Z")
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
})
afterEach(() => vi.useRealTimers())
describe("explicit practice reminders", () => {
  it("honors global and category opt-outs", () => {
    expect(
      reminderEligibility(
        plan,
        { ...profile, notification_preferences: { email_notifications_enabled: false } },
        now
      )
    ).toBe("cancel")
    expect(
      reminderEligibility(
        plan,
        { ...profile, notification_preferences: { inactivity_reminders: false } },
        now
      )
    ).toBe("cancel")
  })
  it("cancels deleted accounts and expired tasks", () => {
    expect(reminderEligibility(plan, undefined, now)).toBe("cancel")
    expect(
      reminderEligibility({ ...plan, savedAt: "2026-08-01T10:00:00.000Z" }, profile, now)
    ).toBe("cancel")
  })
  it("defers quiet hours and the shared email rate cap", () => {
    expect(
      reminderEligibility(
        plan,
        {
          ...profile,
          notification_preferences: { quietHours: { enabled: true, start: 9, end: 12 } },
        },
        now
      )
    ).toBe("defer")
    expect(
      reminderEligibility(
        plan,
        { ...profile, last_email_sent_at: now.toISOString(), emails_sent_today: 1 },
        now
      )
    ).toBe("defer")
  })
  it("allows an explicitly scheduled reminder during reasonable hours", () => {
    expect(reminderEligibility(plan, profile, now)).toBe("send")
  })
  it("stops on successful or uncertain delivery", () => {
    expect(reminderDeliveryState(plan, { success: true }, now)).toEqual({
      reminderStatus: "sent",
      nextAttemptAt: null,
    })
    expect(reminderDeliveryState(plan, { success: false, deliveryUncertain: true }, now)).toEqual({
      reminderStatus: "uncertain",
      nextAttemptAt: null,
    })
  })
  it("bounds known failures to three attempts and increases the retry delay", () => {
    expect(
      reminderDeliveryState(plan, { success: false, retryable: true }, now).nextAttemptAt
    ).toBe("2026-10-10T13:00:00.000Z")
    expect(
      reminderDeliveryState({ ...plan, attempts: 2 }, { success: false, retryable: true }, now)
        .nextAttemptAt
    ).toBe("2026-10-10T16:00:00.000Z")
    expect(
      reminderDeliveryState({ ...plan, attempts: 3 }, { success: false, retryable: true }, now)
    ).toEqual({ reminderStatus: "failed", nextAttemptAt: null })
    expect(
      reminderDeliveryState(plan, { success: false, retryable: false }, now).reminderStatus
    ).toBe("failed")
  })
})
