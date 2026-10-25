import { fixture, seedPreferences, profile } from "./firestore-fixture"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
const sdk = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock("@getbrevo/brevo", () => ({
  TransactionalEmailsApi: class {
    setApiKey() {}
    sendTransacEmail = sdk.send
  },
  TransactionalEmailsApiApiKeys: { apiKey: "key" },
  ContactsApi: class {},
  ContactsApiApiKeys: {},
  SendSmtpEmail: class {},
  CreateContact: class {},
}))
import { sendEmail } from "../../brevo"
import { checkDeliveryConsent } from "../guard"
import { patchEmailPreferences } from "../preferences"

const consent = {
  type: "optional" as const,
  userId: "learner",
  category: "spaced_repetition" as const,
}
const options = {
  headers: {
    "List-Unsubscribe": "<https://example.test/unsubscribe>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  },
  consent,
  to: [{ email: "learner@example.test" }],
  subject: "Review",
  htmlContent: "Review",
}
const upstream = vi.fn()
beforeEach(() => {
  fixture.rows.clear()
  fixture.writes.length = 0
  seedPreferences()
  sdk.send.mockReset()
  sdk.send.mockResolvedValue({ body: { messageId: "delivered" } })
  vi.stubEnv("BREVO_API_KEY", "fixture-key")
  upstream.mockReset()
  upstream.mockResolvedValue(
    new Response(JSON.stringify({ id: 7, emailBlacklisted: false }), { status: 200 })
  )
  // Response bodies are single-use; every real request gets its own instance.
  vi.stubGlobal("fetch", (...args: unknown[]) =>
    upstream(...args).then((response: Response) => response.clone())
  )
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("last-mile email consent", () => {
  it("sends an allowed review after checking both stores", async () => {
    expect(await sendEmail(options)).toMatchObject({ success: true })
    expect(upstream).toHaveBeenCalledTimes(1)
    expect(sdk.send).toHaveBeenCalledTimes(1)
  })
  it.each([{ email_notifications_enabled: false }, { spaced_repetition_reminders: false }])(
    "suppresses an already queued message for %j",
    async (preferences) => {
      seedPreferences(preferences)
      expect(await sendEmail(options)).toMatchObject({ success: false, skipped: true })
      expect(sdk.send).not.toHaveBeenCalled()
      expect(upstream).not.toHaveBeenCalled()
    }
  )
  it.each(["email_notifications_enabled", "spaced_repetition_reminders"] as const)(
    "keeps a saved %s opt-out when an old tab replays its preferences map",
    async (key) => {
      vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "fixture-secret")
      await patchEmailPreferences("learner", { [key]: false }, "unsubscribe")
      const raw = profile().notification_preferences as Record<string, unknown>
      raw[key] = true
      expect(await sendEmail(options)).toMatchObject({ skipped: true })
      expect(sdk.send).not.toHaveBeenCalled()
      expect(upstream).not.toHaveBeenCalled()
    }
  )
  it("allows a fresh explicit opt-in after a saved opt-out", async () => {
    vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "fixture-secret")
    await patchEmailPreferences("learner", { spaced_repetition_reminders: false }, "account")
    await patchEmailPreferences("learner", { spaced_repetition_reminders: true }, "account")
    expect(await sendEmail(options)).toMatchObject({ success: true })
    expect(sdk.send).toHaveBeenCalledTimes(1)
  })
  it("pulls a newsletter unsubscribe into global optional-email suppression", async () => {
    upstream.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 7,
          emailBlacklisted: true,
          statistics: {
            unsubscriptions: { userUnsubscription: [{ eventTime: "2026-01-01T00:00:00Z" }] },
          },
        })
      )
    )
    expect(await sendEmail(options)).toMatchObject({ skipped: true })
    expect(profile().notification_preferences).toMatchObject({
      email_notifications_enabled: false,
      marketing_emails: false,
    })
    expect(sdk.send).not.toHaveBeenCalled()
  })
  it("rechecks preferences after the provider lookup", async () => {
    upstream.mockImplementation(async () => {
      seedPreferences({ email_notifications_enabled: false })
      return new Response(JSON.stringify({ id: 7, emailBlacklisted: false }))
    })
    expect(await sendEmail(options)).toMatchObject({ skipped: true })
    expect(sdk.send).not.toHaveBeenCalled()
  })
  it("stops retries when the user unsubscribes between attempts", async () => {
    vi.useFakeTimers()
    sdk.send.mockImplementation(async () => {
      seedPreferences({ email_notifications_enabled: false })
      throw { statusCode: 503 }
    })
    const promise = sendEmail(options)
    await vi.advanceTimersByTimeAsync(3_000)
    expect(await promise).toMatchObject({ skipped: true })
    expect(sdk.send).toHaveBeenCalledTimes(1)
  })
  it("fails closed when consent cannot be verified", async () => {
    upstream.mockRejectedValue(new Error("network unavailable"))
    expect(await sendEmail(options)).toMatchObject({ success: false, retryable: true })
    expect(sdk.send).not.toHaveBeenCalled()
  })
  it("doesn't deliver to a stale or different email address", async () => {
    expect(
      await checkDeliveryConsent(consent, [{ email: "different@example.test" }])
    ).toMatchObject({ skipped: true })
  })
  it("keeps essential billing/security messages separate from optional preferences", async () => {
    seedPreferences({ email_notifications_enabled: false })
    upstream.mockRejectedValue(new Error("provider consent unavailable"))
    expect(await sendEmail({ ...options, consent: { type: "essential" } })).toMatchObject({
      success: true,
    })
    expect(upstream).not.toHaveBeenCalled()
  })
})
