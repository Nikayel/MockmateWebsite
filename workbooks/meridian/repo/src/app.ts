import type { DbClient } from "./db/client"
import { createMemoryDb } from "./db/memory-db"
import { createOutboxDeliveryHandler } from "./delivery/webhooks"
import type { WebhookHttpClient } from "./delivery/types"
import { createApp } from "./http/server"
import type { App } from "./http/types"
import { registerClaimRoutes } from "./http/routes/claims"
import { registerDocumentRoutes } from "./http/routes/documents"
import { registerHealthRoutes } from "./http/routes/health"
import type { Outbox } from "./queue/outbox"
import { createOutbox } from "./queue/outbox"

export interface MeridianAppDeps {
  db?: DbClient
  httpClient: WebhookHttpClient
}

export interface MeridianApp {
  app: App
  db: DbClient
  outbox: Outbox
  /** Drains every pending outbox entry through the same handler production wires up to the
   * scheduler - call this directly in a test instead of waiting on a timer. */
  drainOutbox(): Promise<number>
}

/**
 * Wires the seams together into one runnable app: an HTTP layer, a database (real Postgres
 * has no implementation of `DbClient` here yet, so this always falls back to the in-memory
 * one unless a caller supplies its own), and an outbox whose delivery handler is bound to
 * whatever `httpClient` was given. Nothing here starts the outbox scheduler - see
 * src/queue/scheduler.ts for the timer that would do that in a running process.
 */
export function createMeridianApp(deps: MeridianAppDeps): MeridianApp {
  const db = deps.db ?? createMemoryDb()
  const outbox = createOutbox()
  const app = createApp()
  const deliveryHandler = createOutboxDeliveryHandler({ db, httpClient: deps.httpClient })

  registerHealthRoutes(app)
  registerClaimRoutes(app, { db, outbox })
  registerDocumentRoutes(app, { db })

  return {
    app,
    db,
    outbox,
    drainOutbox: () => outbox.drain(deliveryHandler),
  }
}
