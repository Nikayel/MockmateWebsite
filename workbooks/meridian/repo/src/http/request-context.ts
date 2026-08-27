import type { HandlerRequest } from "./types"

/**
 * There is no auth system in front of this API yet - every request carries its tenant in a
 * header, and we trust whoever is calling us to set it correctly.
 */
export function requireTenantId(req: HandlerRequest): string {
  const tenantId = req.headers["x-tenant-id"]
  if (!tenantId) {
    throw new Error("Missing x-tenant-id header")
  }
  return tenantId
}
