import type { DbClient } from "../client"
import type { CreateWebhookDeliveryInput, WebhookDelivery } from "../../domain/webhook-delivery"
import { INSERT_WEBHOOK_DELIVERY, LIST_DELIVERIES_FOR_CLAIM } from "../queries"

interface WebhookDeliveryRow {
  id: string
  tenant_id: string
  claim_id: string
  status: "delivered" | "failed"
  payload: string
  created_at: string
  delivered_at: string | null
}

function toWebhookDelivery(row: WebhookDeliveryRow): WebhookDelivery {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    claimId: row.claim_id,
    status: row.status,
    payload: row.payload,
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
  }
}

export async function insertWebhookDelivery(
  db: DbClient,
  input: CreateWebhookDeliveryInput
): Promise<WebhookDelivery> {
  const createdAt = new Date().toISOString()
  const { rows } = await db.query<WebhookDeliveryRow>(INSERT_WEBHOOK_DELIVERY, [
    input.id,
    input.tenantId,
    input.claimId,
    input.status,
    input.payload,
    createdAt,
  ])
  return toWebhookDelivery(rows[0])
}

export async function listDeliveriesForClaim(
  db: DbClient,
  claimId: string
): Promise<WebhookDelivery[]> {
  const { rows } = await db.query<WebhookDeliveryRow>(LIST_DELIVERIES_FOR_CLAIM, [claimId])
  return rows.map(toWebhookDelivery)
}
