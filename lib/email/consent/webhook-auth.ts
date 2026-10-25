import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

export function consentWebhookToken(): string | null {
  const key = process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.CRON_SECRET
  return key
    ? createHmac("sha256", key).update("brevo-email-consent-webhook-v1").digest("hex")
    : null
}
export function validConsentWebhook(request: Request): boolean {
  const token = consentWebhookToken()
  if (!token) return false
  const expected = Buffer.from(`Bearer ${token}`)
  const provided = Buffer.from(request.headers.get("authorization") ?? "")
  return expected.length === provided.length && timingSafeEqual(expected, provided)
}
