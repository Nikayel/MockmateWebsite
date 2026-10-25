import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readProviderConsent, suppressMarketing } from "../provider"
import { consentWebhookToken, validConsentWebhook } from "../webhook-auth"
beforeEach(() => vi.stubEnv("BREVO_API_KEY", "fixture"))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
describe("Brevo consent adapter", () => {
  it("uses actual opt-out events, not arbitrary contact modification times", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 7,
            emailBlacklisted: true,
            modifiedAt: "2026-09-01T00:00:00Z",
            statistics: {
              unsubscriptions: { userUnsubscription: [{ eventTime: "2026-01-01T00:00:00Z" }] },
            },
          })
        )
      )
    )
    expect((await readProviderConsent("learner@example.test")).fingerprint).toBe(
      `7:${Date.parse("2026-01-01T00:00:00Z")}`
    )
  })
  it("only suppresses campaigns and never blocks billing senders or changes addresses", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetch)
    await suppressMarketing("learner+test@example.test")
    expect(fetch).toHaveBeenCalledWith(
      "https://api.brevo.com/v3/contacts/learner%2Btest%40example.test",
      expect.objectContaining({ method: "PUT", body: '{"emailBlacklisted":true}' })
    )
  })
  it("treats a missing contact as absent without creating or subscribing it", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
    vi.stubGlobal("fetch", fetch)
    expect(await readProviderConsent("absent@example.test")).toEqual({
      blocked: false,
      fingerprint: null,
    })
    await expect(suppressMarketing("absent@example.test")).resolves.toBeUndefined()
    expect(fetch.mock.calls.every(([, options]) => ["GET", "PUT"].includes(options.method))).toBe(
      true
    )
  })
  it("authenticates callbacks with a purpose-specific derived secret", () => {
    vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "fixture-secret")
    const token = consentWebhookToken()
    expect(token).not.toBe("fixture-secret")
    expect(
      validConsentWebhook(
        new Request("https://test", { headers: { authorization: `Bearer ${token}` } })
      )
    ).toBe(true)
    expect(
      validConsentWebhook(
        new Request("https://test", { headers: { authorization: "Bearer wrong" } })
      )
    ).toBe(false)
    expect(validConsentWebhook(new Request("https://test"))).toBe(false)
  })
})
