import { fixture, seedPreferences, profile } from "./firestore-fixture"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { patchEmailPreferences } from "../preferences"
import { syncEmailSuppression } from "../sync"
import { providerSuppressionApplies } from "../provider-state"

beforeEach(() => {
  vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "fixture-secret")
  fixture.rows.clear()
  fixture.writes.length = 0
  seedPreferences()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
describe("central preference writes", () => {
  it("rejects an unsigned suppression job before any external call", async () => {
    profile().email_consent_sync = {
      pending: true,
      email: "victim@example.test",
      revision: "forged",
      intent: "marketing_only",
    }
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    expect(await syncEmailSuppression("learner")).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
  it("never lets a client-editable profile target a different Auth address", async () => {
    profile().email = "victim@example.test"
    await patchEmailPreferences("learner", { marketing_emails: false }, "account")
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    expect(await syncEmailSuppression("learner")).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
  it("clears the due date when an explicit consent change cancels queued suppression", async () => {
    await patchEmailPreferences("learner", { marketing_emails: false }, "account")
    await patchEmailPreferences("learner", { marketing_emails: true }, "account")
    expect(profile().email_consent_sync).toMatchObject({ pending: false })
    expect(profile().email_consent_sync).not.toHaveProperty("nextAttemptAt")
  })
  it("seeds only missing defaults while preserving existing opt-outs", async () => {
    profile().notification_preferences = { spaced_repetition_reminders: false }
    await patchEmailPreferences("learner", {}, "account")
    expect(profile().notification_preferences).toMatchObject({
      spaced_repetition_reminders: false,
      email_notifications_enabled: true,
      marketing_emails: false,
    })
  })
  it("patches one field without restoring an unrelated, newer unsubscribe", async () => {
    seedPreferences({ spaced_repetition_reminders: false, timezone: "America/Detroit" })
    await patchEmailPreferences("learner", { marketing_emails: false }, "account")
    expect(profile().notification_preferences).toMatchObject({
      spaced_repetition_reminders: false,
      marketing_emails: false,
      timezone: "America/Detroit",
    })
    expect(profile().email_consent_sync).toMatchObject({ pending: true, intent: "marketing_only" })
  })
  it("saves the opt-out and durable provider work in one transaction", async () => {
    await patchEmailPreferences(
      "learner",
      { email_notifications_enabled: false, marketing_emails: false },
      "unsubscribe"
    )
    expect(profile().notification_preferences).toMatchObject({ email_notifications_enabled: false })
    expect(profile().email_consent_sync).toMatchObject({
      pending: true,
      email: "learner@example.test",
    })
    expect(fixture.rows.get("notification_preferences/learner")).toMatchObject({
      channels: { email: false, in_app: true, push: true },
    })
  })
  it("does not recreate an account from an old unsubscribe link", async () => {
    fixture.rows.clear()
    expect(
      await patchEmailPreferences("deleted", { marketing_emails: false }, "unsubscribe")
    ).toBeNull()
    expect(fixture.rows.size).toBe(0)
  })
  it("leaves provider synchronization pending on failure", async () => {
    await patchEmailPreferences("learner", { marketing_emails: false }, "account")
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
    expect(await syncEmailSuppression("learner")).toBe(false)
    expect(profile().email_consent_sync).toMatchObject({ pending: true })
    expect(profile().notification_preferences).toMatchObject({ marketing_emails: false })
  })
  it("marks its own suppression before calling Brevo and never unblocks a contact", async () => {
    await patchEmailPreferences("learner", { marketing_emails: false }, "account")
    const fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      if (init.method === "PUT") {
        expect(profile().email_consent).toMatchObject({ managed_marketing_block: "7:blocked" })
        expect(JSON.parse(String(init.body))).toEqual({ emailBlacklisted: true })
        return new Response(null, { status: 204 })
      }
      return new Response(JSON.stringify({ id: 7, emailBlacklisted: false }))
    })
    vi.stubEnv("BREVO_API_KEY", "fixture-key")
    vi.stubGlobal("fetch", fetch)
    expect(await syncEmailSuppression("learner")).toBe(true)
    expect(profile().email_consent_sync).toMatchObject({ pending: false })
    expect(providerSuppressionApplies(profile(), { blocked: true, fingerprint: "7:blocked" })).toBe(
      false
    )
    expect(
      providerSuppressionApplies(profile(), {
        blocked: true,
        fingerprint: "7:later-unsubscribe",
        eventAt: 1,
      })
    ).toBe(true)
    vi.unstubAllEnvs()
  })
  it("distinguishes an explicit optional-email opt-in from an old provider event", () => {
    const current = {
      email_consent: {
        provider_fingerprint: "7:100",
        provider_opt_out_at: "2026-01-01T00:00:00Z",
        explicit_optional_opt_in_at: "2026-02-01T00:00:00Z",
      },
    }
    expect(providerSuppressionApplies(current, { blocked: true, fingerprint: "7:100" })).toBe(false)
    expect(
      providerSuppressionApplies(current, {
        blocked: true,
        fingerprint: "7:200",
        eventAt: Date.parse("2026-03-01T00:00:00Z"),
      })
    ).toBe(true)
  })
})
