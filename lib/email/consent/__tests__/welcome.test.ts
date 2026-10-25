import { fixture, seedPreferences, profile } from "./firestore-fixture"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"
const sender = vi.hoisted(() => vi.fn())
vi.mock("@/lib/email", () => ({ sendWelcomeEmail: sender }))
import { POST } from "@/app/api/email/welcome/route"
beforeEach(() => {
  fixture.rows.clear()
  fixture.writes.length = 0
  seedPreferences({
    email_notifications_enabled: false,
    inactivity_reminders: false,
    spaced_repetition_reminders: false,
  })
  vi.spyOn(console, "log").mockImplementation(() => undefined)
})
afterEach(() => vi.restoreAllMocks())
const request = {
  headers: new Map([["authorization", "Bearer fixture"]]),
  json: async () => ({ userId: "learner", email: "learner@example.test" }),
} as unknown as NextRequest
describe("welcome never resets consent", () => {
  it.each([true, false])(
    "preserves disabled preferences when delivery success=%s",
    async (success) => {
      sender.mockResolvedValue({ success, error: success ? undefined : "mock failure" })
      await POST(request)
      expect(profile().notification_preferences).toMatchObject({
        email_notifications_enabled: false,
        inactivity_reminders: false,
        spaced_repetition_reminders: false,
      })
      expect(fixture.rows.get("notification_preferences/learner")).toMatchObject({
        channels: { email: false },
        typePreferences: { spaced_repetition_review: { enabled: false } },
      })
    }
  )
  it("does not mark a suppressed welcome as sent or failed", async () => {
    sender.mockResolvedValue({ success: false, skipped: true })
    expect((await POST(request)).status).toBe(200)
    expect(profile()).not.toHaveProperty("welcome_email_sent")
    expect(profile()).not.toHaveProperty("welcome_email_failed")
    expect(profile()).not.toHaveProperty("welcome_email_pending_at")
  })
})
