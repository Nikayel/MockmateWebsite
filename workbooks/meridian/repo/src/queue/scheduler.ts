import type { DrainHandler, Outbox } from "./outbox"

export interface OutboxScheduler {
  stop(): void
}

/**
 * Wires the outbox to a real timer so it drains on its own once the process is running.
 * Nothing in this repo's test suite ever calls this - tests call `outbox.drain()` directly,
 * on their own schedule.
 */
export function startOutboxScheduler(
  outbox: Outbox,
  handler: DrainHandler,
  intervalMs: number
): OutboxScheduler {
  const timer = setInterval(() => {
    void outbox.drain(handler)
  }, intervalMs)

  return {
    stop: () => clearInterval(timer),
  }
}
