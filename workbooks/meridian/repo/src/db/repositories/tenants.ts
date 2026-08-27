import type { DbClient } from "../client"
import type { Tenant } from "../../domain/tenant"
import { GET_TENANT_BY_ID, INSERT_TENANT } from "../queries"

interface TenantRow {
  id: string
  name: string
  webhook_url: string | null
  webhook_secret: string | null
  created_at: string
}

function toTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    webhookUrl: row.webhook_url,
    webhookSecret: row.webhook_secret,
    createdAt: row.created_at,
  }
}

export interface InsertTenantParams {
  id: string
  name: string
  webhookUrl: string | null
  webhookSecret: string | null
  createdAt: string
}

export async function insertTenant(db: DbClient, params: InsertTenantParams): Promise<Tenant> {
  const { rows } = await db.query<TenantRow>(INSERT_TENANT, [
    params.id,
    params.name,
    params.webhookUrl,
    params.webhookSecret,
    params.createdAt,
  ])
  return toTenant(rows[0])
}

export async function getTenantById(db: DbClient, tenantId: string): Promise<Tenant | null> {
  const { rows } = await db.query<TenantRow>(GET_TENANT_BY_ID, [tenantId])
  return rows[0] ? toTenant(rows[0]) : null
}
