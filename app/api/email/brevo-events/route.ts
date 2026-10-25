import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { adminDb } from "@/lib/firebase-admin"
import { validConsentWebhook } from "@/lib/email/consent/webhook-auth"
import { readProviderConsent } from "@/lib/email/consent/provider"
import { providerSuppressionApplies } from "@/lib/email/consent/provider-state"
import { patchEmailPreferences } from "@/lib/email/consent/preferences"

const eventSchema = z
  .object({
    event: z.enum(["unsubscribe", "unsubscribed"]),
    email: z.string().email(),
    ts_event: z.number().int().positive().optional(),
    ts: z.number().int().positive().optional(),
  })
  .passthrough()
export async function POST(request: NextRequest) {
  if (!validConsentWebhook(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = eventSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid email event" }, { status: 400 })
  try {
    const provider = await readProviderConsent(parsed.data.email)
    if (!provider.blocked) return NextResponse.json({ success: true, ignored: true })
    const addresses = [...new Set([parsed.data.email, parsed.data.email.toLowerCase()])]
    const snapshots = await Promise.all(
      addresses.map((email) =>
        adminDb.collection("profiles").where("email", "==", email).limit(5).get()
      )
    )
    snapshots.push(
      await adminDb
        .collection("profiles")
        .where("email_normalized", "==", parsed.data.email.toLowerCase())
        .limit(5)
        .get()
    )
    const profiles = new Map(
      snapshots.flatMap((snapshot) => snapshot.docs.map((doc) => [doc.id, doc] as const))
    )
    let updated = 0
    for (const doc of profiles.values()) {
      const profile = doc.data()
      if (
        typeof profile.email !== "string" ||
        profile.email.toLowerCase() !== parsed.data.email.toLowerCase()
      )
        continue
      const explicitOptIn = Date.parse(profile.email_consent?.explicit_optional_opt_in_at ?? "")
      const eventAt = (parsed.data.ts_event ?? parsed.data.ts ?? 0) * 1000
      if (
        (eventAt > 0 && explicitOptIn > eventAt) ||
        !providerSuppressionApplies(profile, provider)
      )
        continue
      await patchEmailPreferences(
        doc.id,
        { email_notifications_enabled: false, marketing_emails: false },
        "provider",
        provider.fingerprint ?? undefined,
        provider.eventAt
      )
      updated++
    }
    return NextResponse.json({ success: true, updated })
  } catch {
    return NextResponse.json({ error: "Couldn't persist email consent" }, { status: 503 })
  }
}
