import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { PLATFORM_PROBES } from "../platform-probes"
import { runDependencyProbes, type DependencyProbe } from "../dependency-probes"

/**
 * These probes are the only thing standing between an admin and a green
 * dashboard during a vendor outage, so the properties worth pinning are the
 * ones that used to be violated: nothing reports healthy without evidence, a
 * rejected credential is loud, and no probe spends money.
 */

function probeById(id: string): DependencyProbe {
  const probe = PLATFORM_PROBES.find((candidate) => candidate.id === id)
  if (!probe) throw new Error(`No probe registered for ${id}`)
  return probe
}

async function outcomeOf(id: string) {
  const results = await runDependencyProbes([probeById(id)], { timeoutMs: 1000 })
  return results[0]
}

const HTTP_VENDORS = ["stripe", "openai", "deepseek", "gemini", "deepgram", "brevo"]

describe("PLATFORM_PROBES", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env = { ...originalEnv }
  })

  it("covers every paid dependency the platform runs on", () => {
    const ids = PLATFORM_PROBES.map((probe) => probe.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        "firestore",
        "firebase-auth",
        "stripe",
        "openai",
        "deepseek",
        "gemini",
        "deepgram",
        "brevo",
        "sentry",
      ])
    )
  })

  it("has no duplicate probe ids, which would collide as React keys and alert ids", () => {
    const ids = PLATFORM_PROBES.map((probe) => probe.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(HTTP_VENDORS)(
    "reports %s as unknown, never healthy, when its key is unset",
    async (id) => {
      for (const key of Object.keys(process.env)) {
        if (/_API_KEY$|^STRIPE_SECRET_KEY$/.test(key)) delete process.env[key]
      }

      const result = await outcomeOf(id)
      expect(result.status).toBe("unknown")
      expect(result.latencyMs).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    }
  )

  it.each(HTTP_VENDORS)("reports %s as unhealthy when the vendor rejects our key", async (id) => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x"
    process.env.OPENAI_API_KEY = "x"
    process.env.DEEPSEEK_API_KEY = "x"
    process.env.GEMINI_API_KEY = "x"
    process.env.DEEPGRAM_API_KEY = "x"
    process.env.BREVO_API_KEY = "x"
    vi.mocked(global.fetch).mockResolvedValue(new Response("", { status: 401 }))

    const result = await outcomeOf(id)
    expect(result.status).toBe("unhealthy")
    expect(result.detail).toContain("401")
  })

  it("reports a vendor 500 as unhealthy and a network failure as unhealthy", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x"

    vi.mocked(global.fetch).mockResolvedValue(new Response("", { status: 503 }))
    expect((await outcomeOf("stripe")).status).toBe("unhealthy")

    vi.mocked(global.fetch).mockRejectedValue(new Error("ECONNREFUSED"))
    const failed = await outcomeOf("stripe")
    expect(failed.status).toBe("unhealthy")
    expect(failed.detail).toContain("ECONNREFUSED")
  })

  it("reports a rate-limited vendor as degraded rather than down", async () => {
    process.env.OPENAI_API_KEY = "x"
    vi.mocked(global.fetch).mockResolvedValue(new Response("", { status: 429 }))
    expect((await outcomeOf("openai")).status).toBe("degraded")
  })

  it("uses free metadata reads, never a paid generation endpoint", async () => {
    process.env.OPENAI_API_KEY = "x"
    process.env.DEEPSEEK_API_KEY = "x"
    process.env.GEMINI_API_KEY = "x"
    process.env.DEEPGRAM_API_KEY = "x"
    vi.mocked(global.fetch).mockResolvedValue(new Response("", { status: 200 }))

    await runDependencyProbes(["openai", "deepseek", "gemini", "deepgram"].map(probeById), {
      timeoutMs: 1000,
    })

    const urls = vi.mocked(global.fetch).mock.calls.map((call) => String(call[0]))
    expect(urls).toHaveLength(4)
    for (const url of urls) {
      expect(url).not.toMatch(/completions|embeddings|generateContent|listen|transcri/i)
    }
  })

  it("never reports Sentry as healthy, because delivery cannot be proven for free", async () => {
    delete process.env.SENTRY_DSN
    expect((await outcomeOf("sentry")).status).toBe("unknown")

    process.env.SENTRY_DSN = "https://publickey@o123.ingest.sentry.io/456"
    const configured = await outcomeOf("sentry")
    expect(configured.status).toBe("unknown")
    expect(configured.detail).toContain("cannot be verified")
  })

  it("reports a malformed Sentry DSN as unhealthy", async () => {
    process.env.SENTRY_DSN = "not-a-url"
    expect((await outcomeOf("sentry")).status).toBe("unhealthy")

    process.env.SENTRY_DSN = "https://o123.ingest.sentry.io/456"
    expect((await outcomeOf("sentry")).status).toBe("unhealthy")
  })

  it("reports the Firebase probes as unhealthy when the Admin SDK cannot serve a read", async () => {
    // The global test setup provides a stub Admin SDK with no working query
    // surface, which stands in for a revoked or misconfigured service account.
    const results = await runDependencyProbes(
      [probeById("firestore"), probeById("firebase-auth")],
      { timeoutMs: 1000 }
    )
    for (const result of results) {
      expect(result.status).toBe("unhealthy")
      expect(result.critical).toBe(true)
    }
  })
})
