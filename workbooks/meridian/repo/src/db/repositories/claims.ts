import type { DbClient } from "../client"
import type { Claim, CreateClaimInput } from "../../domain/claim"
import type { ClaimStatus } from "../../domain/claim-status"
import { generateId } from "../../util/ids"
import {
  FIND_CLAIM_BY_EXTERNAL_REF,
  GET_CLAIM_BY_ID,
  INSERT_CLAIM,
  LIST_CLAIMS_BY_TENANT,
} from "../queries"

interface ClaimRow {
  id: string
  tenant_id: string
  external_ref: string
  status: ClaimStatus
  amount: number
  currency: string
  claimant_name: string
  loss_date: string
  created_at: string
}

function toClaim(row: ClaimRow): Claim {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    externalRef: row.external_ref,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    claimantName: row.claimant_name,
    lossDate: row.loss_date,
    createdAt: row.created_at,
  }
}

export async function insertClaim(db: DbClient, input: CreateClaimInput): Promise<Claim> {
  const id = generateId("clm")
  const createdAt = new Date().toISOString()
  const { rows } = await db.query<ClaimRow>(INSERT_CLAIM, [
    id,
    input.tenantId,
    input.externalRef,
    input.status,
    input.amount,
    input.currency,
    input.claimantName,
    input.lossDate,
    createdAt,
  ])
  return toClaim(rows[0])
}

export async function getClaimById(
  db: DbClient,
  tenantId: string,
  claimId: string
): Promise<Claim | null> {
  const { rows } = await db.query<ClaimRow>(GET_CLAIM_BY_ID, [tenantId, claimId])
  return rows[0] ? toClaim(rows[0]) : null
}

export async function listClaimsByTenant(
  db: DbClient,
  tenantId: string,
  limit: number,
  offset: number
): Promise<Claim[]> {
  const { rows } = await db.query<ClaimRow>(LIST_CLAIMS_BY_TENANT, [tenantId, limit, offset])
  return rows.map(toClaim)
}

/**
 * Looks a claim up by the insurer's own reference number - used by the reconciliation job,
 * which does not have a tenant id to go on, only whatever reference the insurer quotes back
 * to us.
 */
export async function findClaimByExternalRef(
  db: DbClient,
  externalRef: string
): Promise<Claim | null> {
  const { rows } = await db.query<ClaimRow>(FIND_CLAIM_BY_EXTERNAL_REF, [externalRef])
  return rows[0] ? toClaim(rows[0]) : null
}
