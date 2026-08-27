/**
 * The hand-written SQL every repository issues, in one place so `src/db/memory-db.ts` can
 * recognize exactly what it is being asked to run. Real placeholders ($1, $2, ...) are
 * positional, matching how the eventual Postgres driver takes them.
 */

export const INSERT_TENANT =
  "INSERT INTO tenants (id, name, webhook_url, webhook_secret, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *"

export const GET_TENANT_BY_ID = "SELECT * FROM tenants WHERE id = $1"

export const INSERT_CLAIM =
  "INSERT INTO claims (id, tenant_id, external_ref, status, amount, currency, claimant_name, loss_date, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *"

export const GET_CLAIM_BY_ID = "SELECT * FROM claims WHERE tenant_id = $1 AND id = $2"

export const LIST_CLAIMS_BY_TENANT =
  "SELECT * FROM claims WHERE tenant_id = $1 ORDER BY created_at LIMIT $2 OFFSET $3"

/** Used by the reconciliation job, which only ever has the insurer's own reference number
 * to go on. */
export const FIND_CLAIM_BY_EXTERNAL_REF = "SELECT * FROM claims WHERE external_ref = $1"

export const INSERT_DOCUMENT =
  "INSERT INTO documents (id, claim_id, file_name, content_type, legacy_path, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *"

export const GET_DOCUMENTS_FOR_CLAIM = "SELECT * FROM documents WHERE claim_id = $1"

export const INSERT_WEBHOOK_DELIVERY =
  "INSERT INTO webhook_deliveries (id, tenant_id, claim_id, status, payload, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *"

export const LIST_DELIVERIES_FOR_CLAIM = "SELECT * FROM webhook_deliveries WHERE claim_id = $1"
