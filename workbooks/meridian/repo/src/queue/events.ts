/** Only one event type exists today - more arrive as more of the claim lifecycle starts
 * publishing to the outbox instead of acting inline. */
export type DomainEventType = "claim.processed"

/**
 * Something that happened, worth telling a tenant about eventually. Enqueuing one of these
 * (see src/queue/outbox.ts) does not send anything by itself - it just means work is pending.
 */
export interface DomainEvent {
  type: DomainEventType
  tenantId: string
  claimId: string
}
