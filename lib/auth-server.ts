/**
 * Server-side authentication helpers for Next.js API routes
 * Handles Firebase ID token verification using Firebase Admin SDK
 */

import { NextRequest } from "next/server"
import { adminAuth } from "./firebase-admin"

// Development mode check - logs only appear in development
const isDev = process.env.NODE_ENV === "development"

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
      if (isDev) console.warn("No authorization header or invalid format")
      return null
    }

    const token = authHeader.substring(7) // Remove "Bearer " prefix

    if (!token) {
      if (isDev) console.warn("Empty token after Bearer prefix")
      return null
    }

    try {
      // Verify the ID token locally using Firebase Admin SDK (without revocation check network hop)
      const decodedToken = await adminAuth.verifyIdToken(token)

      // Return user ID from verified token
      return decodedToken.uid
    } catch (verificationError: any) {
      if (isDev) {
        console.error("Token verification failed:")
        console.error("  Error code:", verificationError?.code)
        console.error("  Error message:", verificationError?.message)

        // Provide more specific error information
        if (verificationError?.code === "auth/argument-error") {
          console.error("  Issue: Invalid token format")
        } else if (verificationError?.code === "auth/id-token-expired") {
          console.error("  Issue: Token has expired")
        } else if (verificationError?.code === "auth/id-token-revoked") {
          console.error("  Issue: Token has been revoked")
        } else if (verificationError?.code === "auth/invalid-id-token") {
          console.error("  Issue: Token is invalid or malformed")
        } else if (verificationError?.code === "auth/project-not-found") {
          console.error("  Issue: Firebase project not found - check Admin SDK initialization")
        }
      }

      return null
    }
  } catch (error) {
    if (isDev) {
      console.error("Error verifying token:", error)
      if (error instanceof Error) {
        console.error("  Error name:", error.name)
        console.error("  Error message:", error.message)
      }
    }
    return null
  }
}

// REMOVED: getUserIdFromBody was a security risk that allowed userId spoofing
// All authentication must use verified Firebase ID tokens via getUserIdFromRequest()
