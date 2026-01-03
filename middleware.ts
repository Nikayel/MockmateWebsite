/**
 * Next.js Edge Middleware
 *
 * Provides server-side protection for admin routes BEFORE pages render.
 * This prevents admin pages from briefly flashing before client-side auth check.
 *
 * SECURITY: This middleware runs on Edge runtime (before page render).
 * - Checks for authentication token in cookies or Authorization header
 * - For /admin/* routes, requires authentication to proceed
 * - Actual admin role verification happens in admin layout (defense-in-depth)
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = ['/admin']

// Routes that should redirect authenticated users away
const AUTH_ROUTES = ['/login', '/signup']

// Public routes that never require auth
const PUBLIC_ROUTES = ['/', '/pricing', '/blog', '/about', '/privacy', '/terms']

/**
 * Check if user appears to be authenticated
 * Note: This is a quick check - full verification happens server-side
 */
function hasAuthToken(request: NextRequest): boolean {
  // Check for Firebase session cookie (set by Firebase Auth)
  const sessionCookie = request.cookies.get('__session')
  if (sessionCookie?.value) {
    return true
  }

  // Check for Firebase auth token in local storage indicator cookie
  // Firebase client SDK stores auth state - we check for indicator cookie
  const firebaseAuth = request.cookies.get('firebase-auth-token')
  if (firebaseAuth?.value) {
    return true
  }

  // Check Authorization header (for API-like requests to pages)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return true
  }

  return false
}

/**
 * Check if path matches any protected route patterns
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )
}

/**
 * Check if path is an auth route (login/signup)
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for API routes, static files, etc.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // Files with extensions
  ) {
    return NextResponse.next()
  }

  const isAuthenticated = hasAuthToken(request)

  // Protect admin routes - redirect to login if not authenticated
  if (isProtectedRoute(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)

      // Add security header to indicate this was a middleware redirect
      const response = NextResponse.redirect(loginUrl)
      response.headers.set('X-Middleware-Redirect', 'auth-required')
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

// Configure which routes use this middleware
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
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
}
