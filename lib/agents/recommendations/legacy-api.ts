import type { NextResponse } from "next/server"

/** Public compatibility paths stay callable; new feedback work uses next-practice. */
export function markLegacyRecommendationResponse(response: NextResponse): NextResponse {
  response.headers.set("Deprecation", "@1791072000") // October 4, 2026 UTC.
  response.headers.set("Link", '</api/recommendations/next-practice>; rel="successor-version"')
  response.headers.set("Cache-Control", "private, no-store")
  return response
}
