/**
 * CSRF protection utilities
 * Implements double-submit cookie pattern for CSRF protection
 */

import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"

const CSRF_TOKEN_HEADER = "X-CSRF-Token"
const CSRF_COOKIE_NAME = "csrf_token"
const CSRF_TOKEN_LENGTH = 32

/**
 * Constant-time string comparison to prevent timing attacks
 * Uses Node.js crypto.timingSafeEqual for proper constant-time comparison
 */
function constantTimeCompare(a: string, b: string): boolean {
  // Use Node.js built-in constant-time comparison
  // Must convert strings to Buffers of equal length
  const aBuffer = Buffer.from(a, "utf8")
  const bBuffer = Buffer.from(b, "utf8")

  // If lengths differ, compare a against itself to maintain constant time
  // but still return false
  if (aBuffer.length !== bBuffer.length) {
    // Create a buffer of same length as a, filled with different content
    // This ensures we do a real comparison (constant time) but always fail
    const dummyBuffer = Buffer.alloc(aBuffer.length, 0)
    timingSafeEqual(aBuffer, dummyBuffer)
    return false
  }

  return timingSafeEqual(aBuffer, bBuffer)
}

/**
 * Generate a random CSRF token
 */
function generateCSRFToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Set CSRF token cookie in response
 */
function setCSRFTokenCookie(response: NextResponse): NextResponse {
  const token = generateCSRFToken()

  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  })

  return response
}

/**
 * Verify CSRF token from request
 */
export function verifyCSRFToken(request: NextRequest): boolean {
  // Only verify for state-changing methods
  const method = request.method.toUpperCase()
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return true // GET, HEAD, OPTIONS are safe
  }

  // Bearer-token-authenticated requests are inherently immune to CSRF: a
  // cross-site attacker cannot set an `Authorization: Bearer <token>` header on
  // a forged request (it is not a simple header, so the browser will not attach
  // it automatically and CORS blocks reading the response). The double-submit
  // cookie pattern below only defends cookie/session auth, which these routes do
  // not use. Without this exemption every Bearer-authed mutation 403s, because
  // the csrf_token cookie is never minted and no client sends X-CSRF-Token.
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return true
  }

  const tokenFromHeader = request.headers.get(CSRF_TOKEN_HEADER)
  const tokenFromCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value

  if (!tokenFromHeader || !tokenFromCookie) {
    return false
  }

  // Use constant-time comparison to prevent timing attacks
  return constantTimeCompare(tokenFromHeader, tokenFromCookie)
}

/**
 * CSRF protection middleware
 * Returns null if CSRF token is valid, or NextResponse with 403 if invalid
 */
export function csrfProtection(request: NextRequest): NextResponse | null {
  if (!verifyCSRFToken(request)) {
    return NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 })
  }

  return null
}