/**
 * Auth helper utilities for API routes
 */

import { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'

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
    console.error('Auth verification failed:', error)
    return {
      authenticated: false,
      userId: null,
      error: error instanceof Error ? error.message : 'Token verification failed',
    }
  }
}

/**
 * Get user ID from request (throws if not authenticated)
 */
export async function requireAuth(request: NextRequest): Promise<string> {
  const result = await verifyAuth(request)

  if (!result.authenticated || !result.userId) {
    throw new Error(result.error || 'Unauthorized')
  }

  return result.userId
}
