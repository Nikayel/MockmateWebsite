import "server-only"
import { z } from "zod"

const eventSchema = z.object({ eventTime: z.string() }).passthrough()
const contactSchema = z
  .object({
    id: z.number(),
    emailBlacklisted: z.boolean(),
    statistics: z
      .object({
        unsubscriptions: z
          .object({ userUnsubscription: z.array(eventSchema).optional() })
          .optional(),
        complaints: z.array(eventSchema).optional(),
        hardBounces: z.array(eventSchema).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
export interface ProviderConsent {
  blocked: boolean
  fingerprint: string | null
  eventAt?: number | null
}

async function contactRequest(email: string, method = "GET") {
  const key = process.env.BREVO_API_KEY
  if (!key) throw new Error("Email provider is not configured")
  return fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
    method,
    headers: { "api-key": key, "Content-Type": "application/json" },
    ...(method === "PUT" ? { body: JSON.stringify({ emailBlacklisted: true }) } : {}),
    signal: AbortSignal.timeout(2_500),
    cache: "no-store",
  })
}
/** Never updates an address, never removes blocklisting, and never creates a contact. */
export async function suppressMarketing(email: string): Promise<void> {
  const result = await contactRequest(email, "PUT")
  if (!result.ok && result.status !== 404)
    throw new Error(`Email suppression unavailable (${result.status})`)
}
export async function readProviderConsent(email: string): Promise<ProviderConsent> {
  const response = await contactRequest(email)
  if (response.status === 404) return { blocked: false, fingerprint: null }
  if (!response.ok) throw new Error(`Email consent unavailable (${response.status})`)
  const contact = contactSchema.parse(await response.json())
  const events = [
    ...(contact.statistics?.unsubscriptions?.userUnsubscription ?? []),
    ...(contact.statistics?.complaints ?? []),
    ...(contact.statistics?.hardBounces ?? []),
  ]
    .map((event) => Date.parse(event.eventTime))
    .filter(Number.isFinite)
  // modifiedAt changes for unrelated edits; it is NOT an unsubscribe timestamp.
  const latest = events.reduce((max, time) => Math.max(max, time), 0)
  return {
    blocked: contact.emailBlacklisted,
    fingerprint: `${contact.id}:${latest || "blocked"}`,
    eventAt: latest || null,
  }
}
