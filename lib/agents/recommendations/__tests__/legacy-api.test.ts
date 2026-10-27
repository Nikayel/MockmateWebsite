import { expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
vi.unmock("next/server")
import { markLegacyRecommendationResponse } from "../legacy-api"

it("deprecates the compatibility contract without changing its body or status", async () => {
  const response = markLegacyRecommendationResponse(
    NextResponse.json({ recommendations: [] }, { status: 200 })
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ recommendations: [] })
  expect(response.headers.get("Deprecation")).toBe(`@${Date.parse("2026-10-04T00:00:00Z") / 1000}`)
  expect(response.headers.get("Link")).toContain("/api/recommendations/next-practice")
  expect(response.headers.get("Cache-Control")).toBe("private, no-store")
})
