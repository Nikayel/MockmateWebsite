import { NextRequest, NextResponse } from "next/server"
import { verifyCronRequest } from "@/lib/cron-auth"
import { maintainEmailConsent } from "@/lib/email/consent/maintenance"

export const maxDuration = 60

/** Maintenance only: this endpoint never sends an email. */
export async function POST(request: NextRequest) {
  const auth = verifyCronRequest(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    return NextResponse.json(await maintainEmailConsent())
  } catch {
    return NextResponse.json(
      { error: "Email consent maintenance could not finish" },
      { status: 503 }
    )
  }
}
