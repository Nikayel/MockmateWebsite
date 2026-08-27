import type { DbClient } from "../../src/db/client"
import { insertTenant } from "../../src/db/repositories/tenants"
import type { Tenant } from "../../src/domain/tenant"

export interface SeedTenantOptions {
  id: string
  name?: string
  webhookUrl?: string | null
  webhookSecret?: string | null
}

/** Inserts a tenant directly through the repository layer, the way a fixture load would,
 * bypassing the HTTP layer entirely (there is no tenant-creation endpoint yet). */
export async function seedTenant(db: DbClient, options: SeedTenantOptions): Promise<Tenant> {
  return insertTenant(db, {
    id: options.id,
    name: options.name ?? "Northwind Mutual",
    webhookUrl: options.webhookUrl ?? null,
    webhookSecret: options.webhookSecret ?? null,
    createdAt: new Date().toISOString(),
  })
}
