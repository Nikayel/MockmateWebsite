import type { OutboxEntry } from "../domain/outbox-entry"
import { generateId } from "../util/ids"
import type { DomainEvent } from "./events"

export type DrainHandler = (entry: OutboxEntry) => Promise<void>

export interface Outbox {
  enqueue(event: DomainEvent): OutboxEntry
  /** Pulls every entry queued right now and hands each to `handler`, in order. Returns how
   * many entries it processed. */
  drain(handler: DrainHandler): Promise<number>
  pendingCount(): number
}

/**
 * An in-process array standing in for a durable outbox table. Nothing here is written to
 * disk.
 */
export function createOutbox(): Outbox {
  const entries: OutboxEntry[] = []

  return {
    enqueue(event) {
      const entry: OutboxEntry = {
        id: generateId("obx"),
        tenantId: event.tenantId,
        claimId: event.claimId,
        eventType: event.type,
        createdAt: new Date().toISOString(),
      }
      entries.push(entry)
      return entry
    },

    async drain(handler) {
      const batch = entries.splice(0, entries.length)
      for (const entry of batch) {
        await handler(entry)
      }
      return batch.length
    },

    pendingCount() {
      return entries.length
    },
  }
}
