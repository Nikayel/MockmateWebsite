/**
 * Admin authentication utilities
 * Provides functions to verify admin access
 */

import { NextRequest } from "next/server"
import { adminAuth } from "./firebase-admin"

// List of admin email addresses
// In production, consider storing this in Firestore or using Firebase custom claims
const ADMIN_EMAILS = [
  "nikayel.jamal@gmail.com",
  // Add more admin emails as needed
]

/**
 * Verify if a user is an admin based on their email
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

/**
 * Get user ID and email from request Authorization header
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<{
  userId: string
  email: string | null
} | null> {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)

    return {
      userId: decodedToken.uid,
      email: decodedToken.email || null,
    }
  } catch (error) {
    console.error("Error verifying auth token:", error)
    return null
  }
}

/**
 * Verify if the request is from an admin user
 * Returns the user info if admin, null otherwise
 */
export async function verifyAdminAccess(request: NextRequest): Promise<{
  userId: string
  email: string
} | null> {
  const user = await getAuthenticatedUser(request)

  if (!user || !user.email) {
    return null
  }

  if (!isAdminEmail(user.email)) {
    return null
  }

  return {
    userId: user.userId,
    email: user.email,
  }
}

/**
 * Get list of admin emails (for client-side checking)
 */
export function getAdminEmails(): string[] {
  return ADMIN_EMAILS
}
