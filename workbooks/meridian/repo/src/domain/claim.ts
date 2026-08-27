import type { ClaimStatus } from "./claim-status"

export interface Claim {
  id: string
  tenantId: string
  /** The reference number the insurer's own system uses - not unique across tenants. */
  externalRef: string
  status: ClaimStatus
  /** Dollars, floating point - see src/money/round-half-up.ts. */
  amount: number
  /** An ISO 4217 code. Always "USD" today - nothing enforces that. */
  currency: string
  claimantName: string
  /** YYYY-MM-DD, no time zone. */
  lossDate: string
  createdAt: string
}

/**
 * What a caller has to give us to open a claim. Nothing upstream of the repository layer
 * checks that these fields actually look like this - see src/http/routes/claims.ts.
 */
export interface CreateClaimInput {
  tenantId: string
  externalRef: string
  status: ClaimStatus
  amount: number
  currency: string
  claimantName: string
  lossDate: string
}
