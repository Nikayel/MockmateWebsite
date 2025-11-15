/**
 * Server-side authentication helpers for Next.js API routes
 * Handles Firebase ID token verification using Firebase Admin SDK
 */

import { NextRequest } from "next/server"
import { adminAuth } from "./firebase-admin"

/**
 * Get Firebase user ID from request with proper token verification
 * Expects Firebase ID token in Authorization header: "Bearer <token>"
 *
 * Uses Firebase Admin SDK for secure token verification
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.substring(7) // Remove "Bearer " prefix

    if (!token) {
      return null
    }

    try {
      // Verify the ID token using Firebase Admin SDK
      // This validates:
      // - Token signature
      // - Token expiration
      // - Token issuer
      // - Token audience
      const decodedToken = await adminAuth.verifyIdToken(token, true)

      // Return user ID from verified token
      return decodedToken.uid
    } catch (verificationError) {
      console.error("Token verification failed:", verificationError)
      return null
    }
  } catch (error) {
    console.error("Error verifying token:", error)
    return null
  }
}

/**
 * Alternative: Get user ID from request body (less secure, but works if token not available)
 * Only use this if the client can't send the token
 */
export function getUserIdFromBody(request: NextRequest): Promise<string | null> {
  return request.json().then(body => body.userId || null).catch(() => null)
}

