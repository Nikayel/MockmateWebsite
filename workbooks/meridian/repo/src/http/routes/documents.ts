import type { DbClient } from "../../db/client"
import { getDocumentsForClaim } from "../../db/repositories/documents"
import type { App } from "../types"

export interface DocumentRouteDeps {
  db: DbClient
}

/** Nothing here checks which tenant the caller belongs to - a claim id is all it takes to
 * see its documents. */
export function registerDocumentRoutes(app: App, deps: DocumentRouteDeps): void {
  app.get("/claims/:id/documents", async (req) => {
    const documents = await getDocumentsForClaim(deps.db, req.params.id)
    return { statusCode: 200, body: { documents } }
  })
}
