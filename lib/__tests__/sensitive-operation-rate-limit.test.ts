import { afterEach, describe, expect, it, vi } from "vitest"

/**
 * The sensitive-operation limiter used to be a single 2-per-hour bucket keyed on IP and shared by
 * checkout, the billing portal and account deletion. On a NAT'd campus network that meant the third
 * person all day could not pay. These pin the two properties that fix it: per-route buckets, and a
 * bucket per signed-in USER rather than per IP.
 */

const verifyIdToken = vi.fn()

async function importRateLimit() {
  vi.resetModules()
  verifyIdToken.mockReset()
  vi.doMock("@/lib/firebase-admin", () => ({ adminAuth: { verifyIdToken } }))
  vi.doMock("./firebase-admin", () => ({ adminAuth: { verifyIdToken } }))
  return import("@/lib/rate-limit")
}

function request(pathname: string, options: { ip?: string; token?: string } = {}) {
  const headers = new Map<string, string>()
  headers.set("x-real-ip", options.ip ?? "203.0.113.7")
  if (options.token) headers.set("authorization", `Bearer ${options.token}`)
  return {
    url: `https://codesparring.dev${pathname}`,
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
  } as never
}

/** Drive a limiter until it refuses, and report how many calls it allowed. */
async function countAllowed(
  limiter: (req: never) => Promise<unknown>,
  req: never,
  attempts: number
): Promise<number> {
  let allowed = 0
  for (let i = 0; i < attempts; i++) {
    if ((await limiter(req)) === null) allowed++
  }
  return allowed
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("sensitiveOperationRateLimit", () => {
  it("gives checkout its own, roomier bucket instead of the deletion allowance", async () => {
    const { sensitiveOperationRateLimit } = await importRateLimit()
    verifyIdToken.mockResolvedValue({ uid: "user_1" })

    const allowed = await countAllowed(
      sensitiveOperationRateLimit,
      request("/api/create-checkout", { token: "tok" }),
      12
    )

    expect(allowed).toBe(10)
  })

  it("keeps account deletion strict", async () => {
    const { sensitiveOperationRateLimit } = await importRateLimit()
    verifyIdToken.mockResolvedValue({ uid: "user_1" })

    const allowed = await countAllowed(
      sensitiveOperationRateLimit,
      request("/api/delete-account", { token: "tok" }),
      5
    )

    expect(allowed).toBe(2)
  })

  it("does not let the billing portal spend the checkout budget", async () => {
    const { sensitiveOperationRateLimit } = await importRateLimit()
    verifyIdToken.mockResolvedValue({ uid: "user_1" })

    await countAllowed(
      sensitiveOperationRateLimit,
      request("/api/customer-portal", { token: "tok" }),
      10
    )
    const checkoutAllowed = await countAllowed(
      sensitiveOperationRateLimit,
      request("/api/create-checkout", { token: "tok" }),
      10
    )

    expect(checkoutAllowed).toBe(10)
  })

  it("gives each signed-in user their own bucket on a shared IP", async () => {
    // The campus-network regression: same NAT'd IP, different people.
    const { sensitiveOperationRateLimit } = await importRateLimit()
    const sharedIp = "198.51.100.4"

    verifyIdToken.mockResolvedValue({ uid: "student_a" })
    await countAllowed(
      sensitiveOperationRateLimit,
      request("/api/create-checkout", { ip: sharedIp, token: "tok_a" }),
      10
    )

    verifyIdToken.mockResolvedValue({ uid: "student_b" })
    const secondStudent = await countAllowed(
      sensitiveOperationRateLimit,
      request("/api/create-checkout", { ip: sharedIp, token: "tok_b" }),
      10
    )

    expect(secondStudent).toBe(10)
  })

  it("falls back to the IP bucket when the caller is anonymous", async () => {
    const { sensitiveOperationRateLimit } = await importRateLimit()

    const allowed = await countAllowed(
      sensitiveOperationRateLimit,
      request("/api/create-checkout", { ip: "192.0.2.99" }),
      12
    )

    expect(allowed).toBe(10)
    expect(verifyIdToken).not.toHaveBeenCalled()
  })

  it("falls back to the IP bucket when a token fails verification", async () => {
    // An unverifiable token must never mint a fresh per-user bucket.
    const { sensitiveOperationRateLimit } = await importRateLimit()
    verifyIdToken.mockRejectedValue(new Error("token expired"))
    const req = request("/api/create-checkout", { ip: "192.0.2.100", token: "forged" })

    const first = await countAllowed(sensitiveOperationRateLimit, req, 10)
    const second = await countAllowed(sensitiveOperationRateLimit, req, 5)

    expect(first).toBe(10)
    expect(second).toBe(0)
  })
})
