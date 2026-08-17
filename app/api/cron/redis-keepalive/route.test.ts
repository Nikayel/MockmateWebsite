import { afterEach, describe, expect, it, vi } from "vitest"

const loggerError = vi.fn()
const loggerInfo = vi.fn()

interface RouteEnv {
  cronSecret?: string
  url?: string
  token?: string
}

async function importRoute(env: RouteEnv, fetchImpl?: unknown) {
  vi.resetModules()
  vi.unstubAllEnvs()
  if (env.cronSecret) vi.stubEnv("CRON_SECRET", env.cronSecret)
  // Stub explicitly (possibly to empty) so a developer's shell env can never leak in.
  vi.stubEnv("UPSTASH_REDIS_REST_URL", env.url ?? "")
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", env.token ?? "")

  loggerError.mockReset()
  loggerInfo.mockReset()
  if (fetchImpl) vi.stubGlobal("fetch", fetchImpl)

  vi.doMock("@/lib/logger", () => ({
    logger: { child: () => ({ error: loggerError, info: loggerInfo, warn: vi.fn() }) },
  }))

  return import("./route")
}

const CONFIGURED: RouteEnv = {
  cronSecret: "secret",
  url: "https://fake-db.upstash.example",
  token: "redis-token",
}

function beat(authHeader: string | null = "Bearer secret") {
  return new Request("http://localhost/api/cron/redis-keepalive", {
    method: "GET",
    headers: authHeader ? { authorization: authHeader } : {},
  }) as never
}

function okUpstash(result: unknown = "OK") {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ result }),
    text: async () => "",
  }))
}

describe("/api/cron/redis-keepalive", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("rejects requests without the cron secret", async () => {
    const fetchMock = okUpstash()
    const { GET } = await importRoute(CONFIGURED, fetchMock)
    const res = await GET(beat(null))
    expect(res.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns a server error when CRON_SECRET is missing", async () => {
    const { GET } = await importRoute({ ...CONFIGURED, cronSecret: undefined })
    const res = await GET(beat())
    expect(res.status).toBe(500)
  })

  it("fails LOUD (500, no fetch) when the Upstash env vars are missing", async () => {
    // Missing config means the rate limiter has no Redis backing — exactly the state
    // this route exists to make visible. It must never report that as healthy.
    const fetchMock = okUpstash()
    const { GET } = await importRoute({ cronSecret: "secret" }, fetchMock)
    const res = await GET(beat())
    expect(res.status).toBe(500)
    expect((res as unknown as { data: { error: string } }).data.error).toContain("UPSTASH")
    expect(fetchMock).not.toHaveBeenCalled()
    expect(loggerError).toHaveBeenCalled()
  })

  it("beats with one real SET (not PING) carrying a TTL", async () => {
    const fetchMock = okUpstash()
    const { GET } = await importRoute(CONFIGURED, fetchMock)

    const res = await GET(beat())

    expect(res.status).toBe(200)
    expect((res as unknown as { data: { success: boolean } }).data.success).toBe(true)

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string>; body: string },
    ]
    expect(url).toBe("https://fake-db.upstash.example")
    expect(init.headers.Authorization).toBe("Bearer redis-token")

    const command = JSON.parse(init.body) as string[]
    expect(command[0]).toBe("SET")
    expect(command[1]).toBe("keepalive:heartbeat")
    expect(Number.isNaN(Date.parse(command[2]))).toBe(false) // ISO timestamp value
    expect(command[3]).toBe("EX")
    expect(command[4]).toBe(String(90 * 24 * 60 * 60))
  })

  it("returns 500 when Upstash is unreachable (the archived-database case)", async () => {
    const { GET } = await importRoute(
      CONFIGURED,
      vi.fn(async () => {
        throw new TypeError("fetch failed")
      })
    )
    const res = await GET(beat())
    expect(res.status).toBe(500)
    expect(loggerError).toHaveBeenCalled()
  })

  it("returns 500 when Upstash rejects the token", async () => {
    const { GET } = await importRoute(
      CONFIGURED,
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({}),
        text: async () => "Unauthorized",
      }))
    )
    const res = await GET(beat())
    expect(res.status).toBe(500)
  })

  it("returns 500 on an unexpected result payload", async () => {
    const { GET } = await importRoute(CONFIGURED, okUpstash(null))
    const res = await GET(beat())
    expect(res.status).toBe(500)
  })
})
