import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth } from "@/lib/auth-helpers"
import { EMAIL_PREFERENCE_KEYS } from "@/lib/email/consent/policy"
import { patchEmailPreferences } from "@/lib/email/consent/preferences"
import { readEmailPreferences } from "@/lib/email/consent/read"
import { syncEmailSuppression } from "@/lib/email/consent/sync"
import { logger } from "@/lib/logger"

const changeSchema = z.object({ key: z.enum(EMAIL_PREFERENCE_KEYS), value: z.boolean() }).strict()
const headers = { "Cache-Control": "private, no-store" }
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const result = await readEmailPreferences(auth.userId)
    return result
      ? NextResponse.json(result, { headers })
      : NextResponse.json({ error: "Profile not found" }, { status: 404 })
  } catch {
    return NextResponse.json({ error: "Couldn't load email preferences" }, { status: 503 })
  }
}
export async function PATCH(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = changeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid preference change" }, { status: 400 })
  try {
    const saved = await patchEmailPreferences(
      auth.userId,
      { [parsed.data.key]: parsed.data.value },
      "account"
    )
    if (!saved) return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    const synced = saved.marketingSyncPending ? await syncEmailSuppression(auth.userId) : true
    return NextResponse.json({ ...saved, marketingSyncPending: !synced }, { headers })
  } catch (error) {
    logger.error("Email preference update failed", { error })
    return NextResponse.json({ error: "Couldn't save email preferences" }, { status: 503 })
  }
}
