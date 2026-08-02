/**
 * Next.js Proxy (routing middleware)
 *
 * Bounces obviously-anonymous requests away from the two surfaces that require an account, before
 * those pages render, so neither flashes its signed-out state on the way to a client-side redirect.
 *
 * Runtime note: in Next 16 this runs on the Node.js runtime, not the Edge runtime. The old header
 * here claimed Edge, which mattered because people reasoned about what APIs were available.
 *
 * SECURITY: this layer is NOT a security boundary. `hasAuthToken()` below is a presence check — ANY
 * value in the `__session` / `firebase-auth-token` cookie passes, nothing is verified — so treat it
 * strictly as a UX gate. Real enforcement lives where it must: admin RBAC in the admin layout and
 * `lib/admin/middleware.ts`, `LearnAuthGuard` in the workspace layout, and every tutorial progress /
 * saved-answer API verifying a real Firebase token server-side.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { isLessonWorkspacePath } from "@/lib/tutorials/lesson-routes"

// Prefix-matched protected routes. `/learn` is deliberately NOT here any more: the track landings,
// the level indexes, and every lesson's reading page at
// `/learn/{track}/{levelSlug}/{lessonId}` are PUBLIC, statically generated, and indexed. Only the
// `.../workspace` child requires an account, and it is matched by `isLessonWorkspacePath` below
// rather than by a prefix, so the gate and the link builder read from one definition and cannot
// drift apart.
const PROTECTED_ROUTES = ["/admin"]

// Routes that should redirect authenticated users away
const AUTH_ROUTES = ["/login", "/signup"]

// Public routes that never require auth
const PUBLIC_ROUTES = ["/", "/pricing", "/blog", "/about", "/privacy", "/terms"]

/**
 * Check if user APPEARS to be authenticated — a presence check, spoofable by
 * construction (any cookie value passes; nothing is verified at the edge).
 * Treat strictly as a UX hint; every protected capability re-verifies a real
 * token server-side.
 */
function hasAuthToken(request: NextRequest): boolean {
  // Check for Firebase session cookie (set by Firebase Auth)
  const sessionCookie = request.cookies.get("__session")
  if (sessionCookie?.value) {
    return true
  }

  // Check for Firebase auth token in local storage indicator cookie
  // Firebase client SDK stores auth state - we check for indicator cookie
  const firebaseAuth = request.cookies.get("firebase-auth-token")
  if (firebaseAuth?.value) {
    return true
  }

  // Check Authorization header (for API-like requests to pages)
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return true
  }

  return false
}

/**
 * Check if path matches any protected route patterns.
 *
 * Two rules, deliberately different in shape: a prefix match for `/admin` (everything under it is
 * protected), and a segment match for a lesson workspace (everything AROUND it is public, so a
 * prefix would over-match and re-gate the whole Learn corpus).
 */
function isProtectedRoute(pathname: string): boolean {
  if (isLessonWorkspacePath(pathname)) return true
  return PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

/**
 * Check if path is an auth route (login/signup)
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip proxy for API routes, static files, etc.
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.includes(".") // Files with extensions
  ) {
    return NextResponse.next()
  }

  const isAuthenticated = hasAuthToken(request)

  // Admin and lesson workspaces: send an anonymous visitor to /login carrying the path they wanted,
  // so signing in returns them to it rather than to a generic dashboard.
  if (isProtectedRoute(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)

      // Add security header to indicate this was a proxy redirect
      const response = NextResponse.redirect(loginUrl)
      response.headers.set("X-Proxy-Redirect", "auth-required")
      return response
    }
  }

  // Optionally redirect authenticated users away from auth pages
  // Uncomment if you want this behavior:
  // if (isAuthRoute(pathname) && isAuthenticated) {
  //   return NextResponse.redirect(new URL('/dashboard', request.url))
  // }

  return NextResponse.next()
}

// Configure which routes use this proxy
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)",
  ],
}
