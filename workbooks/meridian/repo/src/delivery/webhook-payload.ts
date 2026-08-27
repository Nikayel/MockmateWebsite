import type { Claim } from "../domain/claim"

export interface WebhookPayload {
  claimId: string
  externalRef: string
  status: string
  amount: number
  currency: string
}

export function buildWebhookPayload(claim: Claim): WebhookPayload {
  return {
    claimId: claim.id,
    externalRef: claim.externalRef,
    status: claim.status,
    amount: claim.amount,
    currency: claim.currency,
  }
}
