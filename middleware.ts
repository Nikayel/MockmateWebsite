/**
 * Next.js Middleware
 *
 * Provides server-side route protection for admin routes.
 * Runs at the edge before the page is rendered.
 *
 * SECURITY: This adds a first layer of protection for admin routes.
 * Full authorization is still verified in the admin layout and API routes.
 */

import { NextRequest, NextResponse } from 'next/server'

// Routes that require admin authentication
const ADMIN_ROUTES = ['/admin']

// Routes that require any authentication
const PROTECTED_ROUTES = ['/dashboard', '/practice', '/sessions', '/account', '/profile', '/roadmap']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if this is an admin route
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route))

  // Check if this is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))

  if (isAdminRoute || isProtectedRoute) {
    // Check for Firebase auth session cookie or token
    // Firebase stores session info in cookies when using persistence
    const authCookie = request.cookies.get('__session')
    const firebaseAuthCookie = request.cookies.getAll().find(c =>
      c.name.startsWith('firebase-auth-token') ||
      c.name.includes('firebaseLocalStorage')
    )

    // Also check Authorization header (for API-style requests)
    const authHeader = request.headers.get('authorization')

    // If no auth indicators found, redirect to login
    // Note: Full token verification happens server-side in the layout/API
    // This is a quick check to prevent unnecessary page loads
    if (!authCookie && !firebaseAuthCookie && !authHeader) {
      // For admin routes, always redirect to login
      if (isAdminRoute) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        loginUrl.searchParams.set('reason', 'admin_required')
        return NextResponse.redirect(loginUrl)
      }

      // For other protected routes, redirect with return URL
      // But only if it's not an API request
      const isApiRequest = request.headers.get('accept')?.includes('application/json')
      if (!isApiRequest) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }

    // For admin routes, add a header to indicate middleware passed
    // The admin layout can use this for additional verification
    if (isAdminRoute) {
      const response = NextResponse.next()
      response.headers.set('x-middleware-admin-check', 'passed')
      return response
    }
  }

  return NextResponse.next()
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Admin routes
    '/admin/:path*',
    // Protected routes (require login)
    '/dashboard/:path*',
    '/practice/:path*',
    '/sessions/:path*',
    '/account/:path*',
    '/profile/:path*',
    '/roadmap/:path*',
    // Skip static files and API routes (they have their own auth)
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$).*)',
  ],
}
