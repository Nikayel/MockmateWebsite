export type DeliveryStatus = "delivered" | "failed"

export interface WebhookDelivery {
  id: string
  tenantId: string
  claimId: string
  status: DeliveryStatus
  /** The exact JSON string we sent (or are about to send). */
  payload: string
  createdAt: string
  deliveredAt: string | null
}

export interface CreateWebhookDeliveryInput {
  id: string
  tenantId: string
  claimId: string
  status: DeliveryStatus
  payload: string
}
