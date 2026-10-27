import { afterEach, describe, expect, it, vi } from "vitest"
import { verifyFeedbackInternalRequest } from "../internal-auth"

afterEach(() => vi.unstubAllEnvs())

describe("verifyFeedbackInternalRequest", () => {
  it("requires the configured internal secret", () => {
    vi.stubEnv("CRON_SECRET", "worker-secret")
    expect(verifyFeedbackInternalRequest(new Request("https://example.test"))).toBe(false)
    expect(
      verifyFeedbackInternalRequest(
        new Request("https://example.test", {
          headers: { "x-feedback-internal-secret": "wrong-secret" },
        })
      )
    ).toBe(false)
  })

  it("accepts the configured internal secret", () => {
    vi.stubEnv("CRON_SECRET", "worker-secret")
    expect(
      verifyFeedbackInternalRequest(
        new Request("https://example.test", {
          headers: { "x-feedback-internal-secret": "worker-secret" },
        })
      )
    ).toBe(true)
  })

  it("fails closed when the secret is not configured", () => {
    vi.stubEnv("CRON_SECRET", "")
    expect(
      verifyFeedbackInternalRequest(
        new Request("https://example.test", {
          headers: { "x-feedback-internal-secret": "" },
        })
      )
    ).toBe(false)
  })
})
