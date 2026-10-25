import { fixture, seedPreferences, profile } from "./firestore-fixture"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"
import { consentWebhookToken } from "../webhook-auth"
import { ensureConsentWebhook } from "../webhook-setup"
import { POST } from "@/app/api/email/brevo-events/route"

const body = { event: "unsubscribe", email: "learner@example.test", ts_event: 1767225600 }
const request = (payload: unknown = body, valid = true) =>
  ({
    headers: new Map([
      ["authorization", valid ? `Bearer ${consentWebhookToken()}` : "Bearer wrong"],
    ]),
    json: async () => payload,
  }) as unknown as NextRequest
beforeEach(() => {
  fixture.rows.clear()
  fixture.writes.length = 0
  seedPreferences()
  vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "fixture-secret")
  vi.stubEnv("BREVO_API_KEY", "fixture-key")
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
describe("provider unsubscribe callback", () => {
  it("rejects an unauthenticated callback before accessing the provider or profile", async () => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    expect((await POST(request(body, false))).status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
    expect(fixture.writes).toHaveLength(0)
  })
  it("validates the event shape", async () => {
    expect((await POST(request({ event: "opened", email: "learner@example.test" }))).status).toBe(
      400
    )
  })
  it("persists a real newsletter unsubscribe and treats duplicate events as no-ops", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        async () =>
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
    )
    expect((await POST(request())).status).toBe(200)
    expect(profile().notification_preferences).toMatchObject({
      email_notifications_enabled: false,
      marketing_emails: false,
    })
    const writes = fixture.writes.length
    expect((await POST(request())).status).toBe(200)
    expect(fixture.writes).toHaveLength(writes)
  })
  it("does not undo a newer explicit user opt-in when an old event arrives late", async () => {
    const current = profile()
    current.email_consent = { explicit_optional_opt_in_at: "2026-02-01T00:00:00Z" }
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(
          async () => new Response(JSON.stringify({ id: 7, emailBlacklisted: true }))
        )
    )
    await POST(request())
    expect(profile().notification_preferences).toMatchObject({ email_notifications_enabled: true })
  })
})
describe("webhook provisioning", () => {
  it("handles Brevo's actual empty-account 400 response and creates an authenticated callback", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: "document_not_found", message: "Webhook record does not exist" }),
          { status: 400 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 12 }), { status: 201 }))
    vi.stubGlobal("fetch", fetch)
    expect(await ensureConsentWebhook()).toBe(true)
    const options = fetch.mock.calls[1][1] as RequestInit
    const payload = JSON.parse(String(options.body))
    expect(payload).toMatchObject({
      type: "marketing",
      events: ["unsubscribed"],
      headers: [{ key: "Authorization", value: `Bearer ${consentWebhookToken()}` }],
    })
    expect(options.method).toBe("POST")
  })
  it("refreshes existing webhook authentication without creating duplicates", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            webhooks: [
              {
                id: 12,
                url: "https://www.codesparring.dev/api/email/brevo-events",
                type: "marketing",
                events: ["unsubscribed"],
              },
            ],
          })
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetch)
    expect(await ensureConsentWebhook()).toBe(true)
    expect(fetch.mock.calls[1][0]).toBe("https://api.brevo.com/v3/webhooks/12")
    expect(fetch.mock.calls[1][1].method).toBe("PUT")
  })
})
