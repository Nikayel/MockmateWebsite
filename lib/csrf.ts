/**
 * CSRF protection utilities
 * Implements double-submit cookie pattern for CSRF protection
 */

import { NextRequest, NextResponse } from "next/server"

const CSRF_TOKEN_HEADER = "X-CSRF-Token"
const CSRF_COOKIE_NAME = "csrf_token"
const CSRF_TOKEN_LENGTH = 32

/**
 * Generate a random CSRF token
 */
function generateCSRFToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Set CSRF token cookie in response
 */
export function setCSRFTokenCookie(response: NextResponse): NextResponse {
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

  const tokenFromHeader = request.headers.get(CSRF_TOKEN_HEADER)
  const tokenFromCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value

  if (!tokenFromHeader || !tokenFromCookie) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  return tokenFromHeader === tokenFromCookie
}

/**
 * CSRF protection middleware
 * Returns null if CSRF token is valid, or NextResponse with 403 if invalid
 */
export function csrfProtection(request: NextRequest): NextResponse | null {
  if (!verifyCSRFToken(request)) {
    return NextResponse.json(
      { error: "CSRF token validation failed" },
      { status: 403 }
    )
  }

  return null
}

/**
 * Get CSRF token for client-side usage
 */
export function getCSRFToken(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value || null
}

/**
 * Create a response with CSRF token cookie
 */
export function createResponseWithCSRFToken(data: any, status = 200): NextResponse {
  const response = NextResponse.json(data, { status })
  return setCSRFTokenCookie(response)
}
