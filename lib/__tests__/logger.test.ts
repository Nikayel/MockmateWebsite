/**
 * Logger delivery tests.
 *
 * `sendToExternalService` returns early whenever NODE_ENV is "development" or
 * "test", which is why this transport had never been exercised: under vitest it
 * is always a no-op. These tests re-import the module with NODE_ENV stubbed to
 * "production" so the real delivery path runs against a mocked fetch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/components/monitoring/report-client-error", () => ({
  reportClientError: vi.fn(),
}))

const TEST_DSN = "https://publickey@o123.ingest.sentry.io/456"
const VERCEL_REQUEST_CONTEXT = Symbol.for("@vercel/request-context")

/** Promises handed to Vercel's `waitUntil` by the logger under test. */
let deferredDeliveries: Promise<unknown>[] = []
let fetchMock: ReturnType<typeof vi.fn>

function installVercelRequestContext() {
  ;(globalThis as unknown as Record<symbol, unknown>)[VERCEL_REQUEST_CONTEXT] = {
    get: () => ({
      waitUntil: (promise: Promise<unknown>) => {
        deferredDeliveries.push(promise)
      },
    }),
  }
}

function removeVercelRequestContext() {
  delete (globalThis as unknown as Record<symbol, unknown>)[VERCEL_REQUEST_CONTEXT]
}

interface LoadOptions {
  nodeEnv?: string
  vercelEnv?: string
  sentryDsn?: string
}

/**
 * Re-evaluate the logger module so its module-scope env snapshots (isDev,
 * isTest, the cached DSN) pick up the stubbed environment.
 */
async function loadLogger(options: LoadOptions = {}) {
  vi.resetModules()
  vi.stubEnv("NODE_ENV", options.nodeEnv ?? "production")
  vi.stubEnv("VERCEL_ENV", options.vercelEnv)
  vi.stubEnv("SENTRY_DSN", options.sentryDsn ?? TEST_DSN)
  // Keep the other transports out of the way so fetch calls are Sentry's alone.
  vi.stubEnv("LOGFLARE_API_KEY", undefined)
  vi.stubEnv("LOGFLARE_SOURCE_ID", undefined)
  vi.stubEnv("ERROR_WEBHOOK_URL", undefined)

  const reporter = await import("@/components/monitoring/report-client-error")
  const { logger } = await import("../logger")
  return { logger, reportClientError: vi.mocked(reporter.reportClientError) }
}

/** Wait for everything the logger registered with `waitUntil` to settle. */
async function flushDeliveries() {
  await Promise.all(deferredDeliveries)
}

function sentryPayload(callIndex = 0) {
  const [, init] = fetchMock.mock.calls[callIndex] as [string, RequestInit]
  return JSON.parse(init.body as string)
}

beforeEach(() => {
  deferredDeliveries = []
  fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => "" }))
  vi.stubGlobal("fetch", fetchMock)
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
  vi.spyOn(console, "info").mockImplementation(() => {})
  vi.spyOn(console, "log").mockImplementation(() => {})
  installVercelRequestContext()
})

afterEach(() => {
  removeVercelRequestContext()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("logger keep-alive on Vercel", () => {
  it("registers the Sentry delivery with waitUntil instead of leaving it floating", async () => {
    const { logger } = await loadLogger()

    logger.error("Checkout handler exploded", { endpoint: "/api/checkout" })

    expect(deferredDeliveries).toHaveLength(1)
    await flushDeliveries()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe("https://o123.ingest.sentry.io/api/456/store/")
  })

  it("registers warnings and 5xx apiRequest events too", async () => {
    const { logger } = await loadLogger()

    logger.warn("Retrying provider")
    logger.apiRequest("/api/chat", "POST", 500, 12)

    expect(deferredDeliveries).toHaveLength(2)
    await flushDeliveries()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("degrades to a plain floating promise when the Vercel context is absent", async () => {
    removeVercelRequestContext()
    const { logger } = await loadLogger()

    expect(() => logger.error("No host context here")).not.toThrow()

    expect(deferredDeliveries).toHaveLength(0)
    // The send is still issued; it is just not kept alive by the host.
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })

  it("never lets a failed delivery escape as a rejection", async () => {
    fetchMock.mockRejectedValue(new Error("network down"))
    const { logger } = await loadLogger()

    expect(() => logger.error("Delivery will fail")).not.toThrow()
    // Resolving (rather than rejecting) is the point: keepAliveUntilSettled
    // hands Vercel a promise that can never reject.
    await expect(flushDeliveries()).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe("logger.payment delivery", () => {
  it("reaches Sentry in production even though it logs at info", async () => {
    const { logger } = await loadLogger()

    logger.payment("subscription.upgraded", { userId: "u_1", plan: "pro" })

    await flushDeliveries()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const payload = sentryPayload()
    expect(payload.level).toBe("info")
    expect(payload.message.formatted).toBe("[PAYMENT] subscription.upgraded")
  })

  it("still writes the revenue event to the runtime log in production", async () => {
    const { logger } = await loadLogger()

    logger.payment("invoice.payment_failed", { userId: "u_2" })

    expect(console.info).toHaveBeenCalledTimes(1)
    expect(vi.mocked(console.info).mock.calls[0][0]).toContain("[PAYMENT] invoice.payment_failed")
  })

  it("does not promote ordinary logger.info to an external report", async () => {
    const { logger } = await loadLogger()

    logger.info("Cache warmed", { keys: 12 })

    expect(deferredDeliveries).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("Sentry event shape", () => {
  it("labels preview deployments with VERCEL_ENV rather than production", async () => {
    const { logger } = await loadLogger({ vercelEnv: "preview" })

    logger.error("Preview blew up")

    await flushDeliveries()
    expect(sentryPayload().environment).toBe("preview")
  })

  it("falls back to NODE_ENV when VERCEL_ENV is absent", async () => {
    const { logger } = await loadLogger()

    logger.error("Prod blew up")

    await flushDeliveries()
    expect(sentryPayload().environment).toBe("production")
  })

  it("sends statusCode as a string tag so Sentry keeps it", async () => {
    const { logger } = await loadLogger()

    logger.error("Upstream failure", { endpoint: "/api/chat", statusCode: 503 })

    await flushDeliveries()
    const { tags } = sentryPayload()
    expect(tags.statusCode).toBe("503")
    expect(tags.endpoint).toBe("/api/chat")
  })

  it("omits the statusCode tag entirely when there is no status code", async () => {
    const { logger } = await loadLogger()

    logger.error("No status here")

    await flushDeliveries()
    expect(sentryPayload().tags).not.toHaveProperty("statusCode")
  })
})

describe("logger.error in the browser", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { location: { href: "https://codesparring.com/practice" } })
  })

  it("delegates to the client error beacon instead of a doomed Sentry fetch", async () => {
    const { logger, reportClientError } = await loadLogger()
    const cause = new Error("boom")

    logger.error("Editor failed to mount", { error: cause })

    expect(reportClientError).toHaveBeenCalledTimes(1)
    expect(reportClientError).toHaveBeenCalledWith({
      message: "Editor failed to mount",
      stack: cause.stack,
      source: "react-boundary",
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(deferredDeliveries).toHaveLength(0)
  })

  it("routes child-logger errors through the same beacon", async () => {
    const { logger, reportClientError } = await loadLogger()

    logger.child({ component: "CodeEditor" }).error("Late failure")

    expect(reportClientError).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("leaves stack undefined when the context carries no Error", async () => {
    const { logger, reportClientError } = await loadLogger()

    logger.error("Plain client failure", { endpoint: "/practice" })

    expect(reportClientError).toHaveBeenCalledWith({
      message: "Plain client failure",
      stack: undefined,
      source: "react-boundary",
    })
  })
})
