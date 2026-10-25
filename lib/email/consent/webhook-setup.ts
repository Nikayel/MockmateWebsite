import "server-only"
import { getAppBaseUrl } from "@/lib/site-url"
import { consentWebhookToken } from "./webhook-auth"
import { z } from "zod"

const hooksSchema = z.object({
  webhooks: z
    .array(
      z
        .object({ id: z.number(), url: z.string(), events: z.array(z.string()), type: z.string() })
        .passthrough()
    )
    .optional(),
})
/** No email is sent. The existing scheduler configures the authenticated callback. */
export async function ensureConsentWebhook() {
  const token = consentWebhookToken()
  const key = process.env.BREVO_API_KEY
  if (!token || !key) return false
  const url = `${getAppBaseUrl()}/api/email/brevo-events`
  const headers = { "api-key": key, "Content-Type": "application/json" }
  const list = await fetch("https://api.brevo.com/v3/webhooks?type=marketing", {
    headers,
    signal: AbortSignal.timeout(2_500),
    cache: "no-store",
  })
  const payload = await list.json()
  const emptyAccount = list.status === 400 && payload?.code === "document_not_found"
  if (!list.ok && !emptyAccount) return false
  const existing = emptyAccount ? { webhooks: [] } : hooksSchema.parse(payload)
  const current = existing.webhooks?.find(
    (hook) => hook.url === url && hook.type === "marketing" && hook.events.includes("unsubscribed")
  )
  const created = await fetch(
    `https://api.brevo.com/v3/webhooks${current ? `/${current.id}` : ""}`,
    {
      method: current ? "PUT" : "POST",
      headers,
      signal: AbortSignal.timeout(2_500),
      body: JSON.stringify({
        url,
        type: "marketing",
        events: ["unsubscribed"],
        description: "CodeSparring optional-email consent",
        headers: [{ key: "Authorization", value: `Bearer ${token}` }],
      }),
    }
  )
  return created.ok
}
