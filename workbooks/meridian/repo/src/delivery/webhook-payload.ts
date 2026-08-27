import type { Claim } from "../domain/claim"
import { roundHalfUp } from "../money/round-half-up"

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
    amount: roundHalfUp(claim.amount),
    currency: claim.currency,
  }
}
