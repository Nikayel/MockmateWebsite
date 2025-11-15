/**
 * Server-side authentication helpers for Next.js API routes
 * Handles Firebase ID token verification
 */

import { NextRequest } from "next/server"

/**
 * Get Firebase user ID from request
 * Expects Firebase ID token in Authorization header: "Bearer <token>"
 * 
 * For now, decodes the token without verification (less secure but works without Admin SDK)
 * TODO: Add Firebase Admin SDK for proper token verification
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

    // Decode JWT token to get user ID
    // Firebase ID tokens are JWTs with the user ID in the 'sub' claim
    const parts = token.split(".")
    if (parts.length !== 3) {
      return null
    }

    // Decode the payload (second part of JWT)
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString())
    
    // Return user ID from 'sub' claim
    return payload.sub || payload.user_id || null
  } catch (error) {
    console.error("Error decoding token:", error)
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

