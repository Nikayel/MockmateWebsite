import type { DbClient } from "../db/client"
import { getClaimById } from "../db/repositories/claims"
import { getTenantById } from "../db/repositories/tenants"
import { insertWebhookDelivery } from "../db/repositories/webhook-deliveries"
import type { Claim } from "../domain/claim"
import type { DrainHandler } from "../queue/outbox"
import { generateId } from "../util/ids"
import { log } from "../util/logger"
import { withRetry } from "./retry"
import { signPayload } from "./signature"
import type { WebhookHttpClient } from "./types"
import { buildWebhookPayload } from "./webhook-payload"

export interface DeliverWebhookDeps {
  db: DbClient
  httpClient: WebhookHttpClient
}

/**
 * Sends a claim's current status to its tenant's webhook URL, and records that we did.
 * Tenants with no webhook configured are skipped - there is nowhere to send it.
 */
export async function deliverWebhook(deps: DeliverWebhookDeps, claim: Claim): Promise<void> {
  const tenant = await getTenantById(deps.db, claim.tenantId)
  if (!tenant || !tenant.webhookUrl || !tenant.webhookSecret) {
    log("no webhook configured for tenant", { tenantId: claim.tenantId })
    return
  }

  const payload = JSON.stringify(buildWebhookPayload(claim))

  // Recorded as delivered, then sent.
  await insertWebhookDelivery(deps.db, {
    id: generateId("whd"),
    tenantId: claim.tenantId,
    claimId: claim.id,
    status: "delivered",
    payload,
  })

  const signature = signPayload(payload, tenant.webhookSecret)
  await withRetry(() =>
    deps.httpClient.post(tenant.webhookUrl as string, payload, {
      "content-type": "application/json",
      "x-meridian-signature": signature,
    })
  )
}

/**
 * Turns an outbox entry back into a claim and delivers its webhook. This is what the outbox
 * scheduler drains against in production, and what tests call `outbox.drain()` with directly.
 */
export function createOutboxDeliveryHandler(deps: DeliverWebhookDeps): DrainHandler {
  return async (entry) => {
    const claim = await getClaimById(deps.db, entry.tenantId, entry.claimId)
    if (!claim) {
      log("outbox entry references a claim that no longer exists", { claimId: entry.claimId })
      return
    }
    await deliverWebhook(deps, claim)
  }
}
