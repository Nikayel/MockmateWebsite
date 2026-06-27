/**
 * Tests for getClientIdentifier (lib/rate-limit.ts)
 *
 * SECURITY REGRESSION: the previous implementation trusted the LEFTMOST
 * x-forwarded-for entry and unconditionally trusted cf-connecting-ip, both of
 * which are client-controllable on Vercel — letting an attacker rotate the
 * spoofed value to mint unlimited rate-limit buckets. These tests lock in the
 * trusted-source ordering and the no-spoof behavior.
 */

import { describe, it, expect, vi } from "vitest"

vi.mock("../logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

function makeRequest(headers: Record<string, string>) {
  return {
    headers: {
      get: vi.fn((name: string) => headers[name.toLowerCase()] ?? headers[name] ?? null),
    },
  } as any
}

describe("getClientIdentifier (trusted client IP)", () => {
  it("prefers the Vercel-trusted x-vercel-forwarded-for header", async () => {
    const { getClientIdentifier } = await import("../rate-limit")
    const id = getClientIdentifier(
      makeRequest({
        "x-vercel-forwarded-for": "203.0.113.7",
        "x-forwarded-for": "1.2.3.4", // attacker-supplied, must be ignored
        "x-real-ip": "9.9.9.9",
      })
    )
    expect(id).toBe("203.0.113.7")
  })

  it("uses the first IP of x-vercel-forwarded-for if it is a list", async () => {
    const { getClientIdentifier } = await import("../rate-limit")
    const id = getClientIdentifier(
      makeRequest({ "x-vercel-forwarded-for": "203.0.113.7, 70.41.3.18" })
    )
    expect(id).toBe("203.0.113.7")
  })

  it("falls back to x-real-ip when no vercel header", async () => {
    const { getClientIdentifier } = await import("../rate-limit")
    const id = getClientIdentifier(
      makeRequest({ "x-real-ip": "198.51.100.5", "x-forwarded-for": "1.2.3.4" })
    )
    expect(id).toBe("198.51.100.5")
  })

  it("uses the RIGHTMOST x-forwarded-for entry (not the spoofable leftmost)", async () => {
    const { getClientIdentifier } = await import("../rate-limit")
    // Attacker prepends a fake IP; the real nearest-proxy IP is rightmost.
    const id = getClientIdentifier(
      makeRequest({ "x-forwarded-for": "evil-spoof, 10.0.0.1, 203.0.113.99" })
    )
    expect(id).toBe("203.0.113.99")
    expect(id).not.toBe("evil-spoof")
  })

  it("does NOT trust cf-connecting-ip (app is on Vercel, not Cloudflare)", async () => {
    const { getClientIdentifier } = await import("../rate-limit")
    const id = getClientIdentifier(
      makeRequest({ "cf-connecting-ip": "attacker-controlled", "x-real-ip": "198.51.100.5" })
    )
    expect(id).toBe("198.51.100.5")
    expect(id).not.toBe("attacker-controlled")
  })

  it('returns a shared "unknown" bucket when no trusted source is present', async () => {
    const { getClientIdentifier } = await import("../rate-limit")
    expect(getClientIdentifier(makeRequest({}))).toBe("unknown")
  })
})
