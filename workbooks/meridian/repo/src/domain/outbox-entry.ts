/**
 * A unit of work waiting to be delivered. Held in process memory (see src/queue/outbox.ts) -
 * nothing here survives a restart.
 */
export interface OutboxEntry {
  id: string
  tenantId: string
  claimId: string
  eventType: string
  createdAt: string
}
