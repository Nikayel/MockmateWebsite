import type { DbClient, QueryResult } from "./client"
import * as queries from "./queries"

/**
 * An in-process stand-in for Postgres. It does not parse SQL - it recognizes the exact
 * statements in `src/db/queries.ts` and does the equivalent thing against plain arrays. Every
 * row it returns uses the same snake_case column names a real driver would hand back, so
 * repositories map rows the same way either implementation would require.
 */
export function createMemoryDb(): DbClient {
  const tenants: Record<string, unknown>[] = []
  const claims: Record<string, unknown>[] = []
  const documents: Record<string, unknown>[] = []
  const webhookDeliveries: Record<string, unknown>[] = []

  async function query<T>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    switch (sql) {
      case queries.INSERT_TENANT: {
        const [id, name, webhookUrl, webhookSecret, createdAt] = params
        const row = {
          id,
          name,
          webhook_url: webhookUrl,
          webhook_secret: webhookSecret,
          created_at: createdAt,
        }
        tenants.push(row)
        return { rows: [row as T] }
      }

      case queries.GET_TENANT_BY_ID: {
        const [id] = params
        const row = tenants.find((tenant) => tenant.id === id)
        return { rows: row ? [row as T] : [] }
      }

      case queries.INSERT_CLAIM: {
        const [
          id,
          tenantId,
          externalRef,
          status,
          amount,
          currency,
          claimantName,
          lossDate,
          createdAt,
        ] = params
        const row = {
          id,
          tenant_id: tenantId,
          external_ref: externalRef,
          status,
          amount,
          currency,
          claimant_name: claimantName,
          loss_date: lossDate,
          created_at: createdAt,
        }
        claims.push(row)
        return { rows: [row as T] }
      }

      case queries.GET_CLAIM_BY_ID: {
        const [tenantId, id] = params
        const row = claims.find((claim) => claim.tenant_id === tenantId && claim.id === id)
        return { rows: row ? [row as T] : [] }
      }

      case queries.LIST_CLAIMS_BY_TENANT: {
        const [tenantId, limit, offset] = params as [string, number, number]
        const matching = claims
          .filter((claim) => claim.tenant_id === tenantId)
          .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        return { rows: matching.slice(offset, offset + limit) as T[] }
      }

      case queries.FIND_CLAIM_BY_EXTERNAL_REF: {
        const [externalRef] = params
        const row = claims.find((claim) => claim.external_ref === externalRef)
        return { rows: row ? [row as T] : [] }
      }

      case queries.INSERT_DOCUMENT: {
        const [id, claimId, fileName, contentType, legacyPath, createdAt] = params
        const row = {
          id,
          claim_id: claimId,
          file_name: fileName,
          content_type: contentType,
          legacy_path: legacyPath,
          created_at: createdAt,
        }
        documents.push(row)
        return { rows: [row as T] }
      }

      case queries.GET_DOCUMENTS_FOR_CLAIM: {
        const [claimId] = params
        const matching = documents.filter((document) => document.claim_id === claimId)
        return { rows: matching as T[] }
      }

      case queries.INSERT_WEBHOOK_DELIVERY: {
        const [id, tenantId, claimId, status, payload, createdAt] = params
        const row = {
          id,
          tenant_id: tenantId,
          claim_id: claimId,
          status,
          payload,
          created_at: createdAt,
          delivered_at: status === "delivered" ? createdAt : null,
        }
        webhookDeliveries.push(row)
        return { rows: [row as T] }
      }

      case queries.LIST_DELIVERIES_FOR_CLAIM: {
        const [claimId] = params
        const matching = webhookDeliveries.filter((delivery) => delivery.claim_id === claimId)
        return { rows: matching as T[] }
      }

      default:
        throw new Error(`memory-db: unrecognized query: ${sql}`)
    }
  }

  return { query }
}
