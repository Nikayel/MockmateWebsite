/**
 * Edge AI spend reporting is fire-and-forget by design: it must never delay or
 * break the feedback a user is waiting on. "Best effort" is not the same as
 * "silent", though — reportEdgeUsage used to return `response.ok` to a caller
 * that discards it and swallow transport errors with a bare `catch {}`, so a
 * rotated CRON_SECRET (401) or a schema drift (400) could stop the platform's
 * highest-volume AI path being metered at all, with nothing to see anywhere.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { errorSpy } = vi.hoisted(() => ({ errorSpy: vi.fn() }))

vi.mock("../../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: errorSpy },
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: errorSpy },
}))

const REPORT = {
  userId: "user-1",
  eventType: "feedback_generation" as const,
  provider: "openai",
  promptText: "prompt",
  responseText: "response",
}

describe("reportEdgeUsage failure visibility", () => {
  beforeEach(() => {
    vi.resetModules()
    errorSpy.mockClear()
    vi.stubEnv("CRON_SECRET", "test-secret")
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("returns true and stays quiet on a successful report", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200 })))
    const { reportEdgeUsage } = await import("../edge-reporter")

    expect(await reportEdgeUsage(REPORT)).toBe(true)
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it("logs the status and body when the ingest rejects the report", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => '{"error":"Unauthorized"}',
      }))
    )
    const { reportEdgeUsage } = await import("../edge-reporter")

    expect(await reportEdgeUsage(REPORT)).toBe(false)
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0][1]).toMatchObject({
      status: 401,
      body: '{"error":"Unauthorized"}',
      provider: "openai",
    })
  })

  it("logs a transport failure instead of swallowing it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down")
      })
    )
    const { reportEdgeUsage } = await import("../edge-reporter")

    expect(await reportEdgeUsage(REPORT)).toBe(false)
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0][0]).toContain("Could not reach")
  })

  it("logs at error when reporting is unconfigured, so under-metering is visible", async () => {
    vi.stubEnv("CRON_SECRET", "")
    const { reportEdgeUsage } = await import("../edge-reporter")

    expect(await reportEdgeUsage(REPORT)).toBe(false)
    expect(errorSpy.mock.calls[0][1]).toMatchObject({ reason: "CRON_SECRET unset" })
  })

  it("never rejects from the background wrapper", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("boom")
      })
    )
    const { reportEdgeUsageInBackground } = await import("../edge-reporter")

    expect(() => reportEdgeUsageInBackground(REPORT)).not.toThrow()
  })
})
