/**
 * CSRF protection regression tests.
 *
 * Guards the fix for the bug where every Bearer-authenticated mutation (batch
 * defer, spaced-repetition skip/complete/mark-reviewed, delete-account,
 * promo-code) silently 403'd: the csrf_token cookie is never minted and no
 * client sends X-CSRF-Token, so the double-submit check always failed. Bearer
 * requests are exempt because they are inherently immune to CSRF, while
 * cookie/session flows keep the double-submit protection.
 */

import { describe, it, expect } from "vitest"
import type { NextRequest } from "next/server"
import { verifyCSRFToken, csrfProtection } from "../csrf"

interface MockReqInit {
  method?: string
  authorization?: string
  csrfHeader?: string
  csrfCookie?: string
}

function mockRequest(init: MockReqInit = {}): NextRequest {
  const { method = "POST", authorization, csrfHeader, csrfCookie } = init
  return {
    method,
    headers: {
      get(name: string): string | null {
        const key = name.toLowerCase()
        if (key === "authorization") return authorization ?? null
        if (key === "x-csrf-token") return csrfHeader ?? null
        return null
      },
    },
    cookies: {
      get(name: string): { value: string } | undefined {
        if (name === "csrf_token" && csrfCookie) return { value: csrfCookie }
        return undefined
      },
    },
  } as unknown as NextRequest
}

describe("verifyCSRFToken", () => {
  it("allows a Bearer-authenticated POST with no CSRF cookie or header (the regression)", () => {
    expect(verifyCSRFToken(mockRequest({ authorization: "Bearer abc.def.ghi" }))).toBe(true)
  })

  it("still rejects a cookie/session POST with neither cookie nor header", () => {
    expect(verifyCSRFToken(mockRequest())).toBe(false)
  })

  it("treats safe methods (GET/HEAD/OPTIONS) as always valid", () => {
    expect(verifyCSRFToken(mockRequest({ method: "GET" }))).toBe(true)
    expect(verifyCSRFToken(mockRequest({ method: "HEAD" }))).toBe(true)
    expect(verifyCSRFToken(mockRequest({ method: "OPTIONS" }))).toBe(true)
  })

  it("accepts a valid double-submit token pair (non-Bearer flow still protected)", () => {
    expect(verifyCSRFToken(mockRequest({ csrfHeader: "token123", csrfCookie: "token123" }))).toBe(
      true
    )
  })

  it("rejects a mismatched double-submit token pair", () => {
    expect(verifyCSRFToken(mockRequest({ csrfHeader: "token123", csrfCookie: "different" }))).toBe(
      false
    )
  })

  it("does not exempt non-Bearer Authorization schemes", () => {
    // A "Basic ..." header must not slip past the CSRF check; it falls through
    // to the cookie comparison, which fails with no cookie present.
    expect(verifyCSRFToken(mockRequest({ authorization: "Basic dXNlcjpwYXNz" }))).toBe(false)
  })
})

describe("csrfProtection", () => {
  it("returns null (passes) for a Bearer-authenticated request", () => {
    expect(csrfProtection(mockRequest({ authorization: "Bearer token" }))).toBeNull()
  })

  it("returns a 403 response for a cookie/session request with no token", () => {
    const result = csrfProtection(mockRequest())
    expect(result).not.toBeNull()
    expect((result as unknown as { status: number }).status).toBe(403)
  })
})
