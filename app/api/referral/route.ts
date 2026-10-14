import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"

// Retain an authenticated tombstone for older clients and shared links. New
// enrollment is paused; existing rewards remain available to admin bookkeeping.
async function referralUnavailable(request: NextRequest) {
  const authResult = await verifyAuth(request)
  if (!authResult.authenticated || !authResult.userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    )
  }

  return NextResponse.json(
    {
      error: "The referral program is currently unavailable.",
      code: "REFERRAL_PROGRAM_UNAVAILABLE",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  )
}

export const GET = referralUnavailable
export const POST = referralUnavailable
