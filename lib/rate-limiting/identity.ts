import type { NextRequest } from "next/server"

/** Resolve an address written by the hosting edge, never a client-selected bucket key. */
export function getClientIdentifier(request: NextRequest): string {
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for")
  const vercelIp = vercelForwarded?.split(",")[0]?.trim()
  if (vercelIp) return vercelIp

  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp

  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean)
  return forwarded?.at(-1) ?? "unknown"
}

export async function resolveVerifiedIdentifier(request: NextRequest): Promise<string> {
  const authorization = request.headers.get("authorization") ?? ""
  if (authorization.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim()
    if (token) {
      try {
        const { adminAuth } = await import("@/lib/firebase-admin")
        const decoded = await adminAuth.verifyIdToken(token)
        if (decoded.uid) return `user:${decoded.uid}`
      } catch {
        // The route's auth guard will reject an invalid token; charge its IP meanwhile.
      }
    }
  }
  return `ip:${getClientIdentifier(request)}`
}
