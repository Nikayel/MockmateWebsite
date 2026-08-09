/**
 * Auth helper utilities for API routes
 *
 * Provides standardized authentication patterns to reduce code duplication.
 * Use `withAuth` wrapper for automatic auth handling in route handlers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

export interface AuthResult {
  authenticated: boolean
  userId: string | null
  error?: string
}

/**
 * Verify authentication from request headers
 * Expects: Authorization: Bearer <idToken>
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return {
        authenticated: false,
        userId: null,
        error: 'Missing or invalid Authorization header',
      }
    }

    const idToken = authHeader.split('Bearer ')[1]

    if (!idToken) {
      return {
        authenticated: false,
        userId: null,
        error: 'No token provided',
      }
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)

    return {
      authenticated: true,
      userId: decodedToken.uid,
    }
  } catch (error) {
    logger.warn('Auth verification failed', { error })
    return {
      authenticated: false,
      userId: null,
      error: error instanceof Error ? error.message : 'Token verification failed',
    }
  }
}

/**
 * Standard unauthorized response
 */
function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 })
}

/**
 * Context passed to authenticated route handlers
 */
export interface AuthContext {
  userId: string
  request: NextRequest
}

/**
 * Type for authenticated route handler functions
 */
type AuthenticatedHandler = (
  context: AuthContext
) => Promise<NextResponse>

/**
 * Higher-order function that wraps a route handler with authentication
 * Reduces boilerplate by handling auth check and error response automatically
 *
 * @example
 * // Before (duplicated in 17+ files):
 * export async function GET(request: NextRequest) {
 *   const authResult = await verifyAuth(request)
 *   if (!authResult.authenticated || !authResult.userId) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *   }
 *   const userId = authResult.userId
 *   // ... rest of handler
 * }
 *
 * // After:
 * export const GET = withAuth(async ({ userId, request }) => {
 *   // ... handler code with userId guaranteed
 * })
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await verifyAuth(request)

    if (!authResult.authenticated || !authResult.userId) {
      return unauthorizedResponse(authResult.error)
    }

    return handler({ userId: authResult.userId, request })
  }
}

/**
 * Optional auth - provides userId if authenticated, null otherwise
 * Useful for endpoints that work both for logged in and anonymous users
 */
export interface OptionalAuthContext {
  userId: string | null
  request: NextRequest
}

type OptionalAuthHandler = (
  context: OptionalAuthContext
) => Promise<NextResponse>