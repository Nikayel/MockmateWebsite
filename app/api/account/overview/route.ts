import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { getAccountOverview } from "@/lib/account/overview.server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request)
  if (!authResult.authenticated || !authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await getAccountOverview(authResult.userId)
  const status = result.status === "ready" ? 200 : result.status === "missing_profile" ? 404 : 503

  return NextResponse.json(result, {
    status,
    headers: { "Cache-Control": "no-store" },
  })
}
