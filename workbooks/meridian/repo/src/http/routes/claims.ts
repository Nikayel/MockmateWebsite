import { getDocumentsForClaims } from "../../db/repositories/documents"
import type { DbClient } from "../../db/client"
import { getClaimById, insertClaim, listClaimsByTenant } from "../../db/repositories/claims"
import type { Outbox } from "../../queue/outbox"
import { badRequest, notFound } from "../errors"
import { requireTenantId } from "../request-context"
import type { App, HandlerRequest } from "../types"

export interface ClaimRouteDeps {
  db: DbClient
  outbox: Outbox
}

/** `req.body` is `any` (see src/http/types.ts) - none of these fields are checked before we
 * hand them to the repository layer. */
function parseCreateClaimBody(req: HandlerRequest) {
  const body = req.body
  return {
    externalRef: body?.externalRef,
    amount: body?.amount,
    currency: body?.currency ?? "USD",
    claimantName: body?.claimantName,
    lossDate: body?.lossDate,
  }
}

export function registerClaimRoutes(app: App, deps: ClaimRouteDeps): void {
  app.post("/claims", async (req) => {
    const tenantId = requireTenantId(req)
    const input = parseCreateClaimBody(req)
    if (!input.externalRef || !input.claimantName) {
      return badRequest("externalRef and claimantName are required")
    }

    const claim = await insertClaim(deps.db, {
      tenantId,
      externalRef: input.externalRef,
      status: "submitted",
      amount: input.amount,
      currency: input.currency,
      claimantName: input.claimantName,
      lossDate: input.lossDate,
    })

    deps.outbox.enqueue({ type: "claim.processed", tenantId, claimId: claim.id })

    return { statusCode: 201, body: claim }
  })

  app.get("/claims", async (req) => {
    const tenantId = requireTenantId(req)
    const limit = Number(req.query.limit ?? "20")
    const offset = Number(req.query.offset ?? "0")
    const claims = await listClaimsByTenant(deps.db, tenantId, limit, offset)

    const documentsByClaimId = await getDocumentsForClaims(
      deps.db,
      claims.map((claim) => claim.id)
    )

    return {
      statusCode: 200,
      body: {
        claims: claims.map((claim) => ({
          ...claim,
          documentCount: documentsByClaimId[claim.id]?.length ?? 0,
        })),
      },
    }
  })

  app.get("/claims/:id", async (req) => {
    const tenantId = requireTenantId(req)
    const claim = await getClaimById(deps.db, tenantId, req.params.id)
    if (!claim) return notFound(`claim ${req.params.id} not found`)
    return { statusCode: 200, body: claim }
  })
}
