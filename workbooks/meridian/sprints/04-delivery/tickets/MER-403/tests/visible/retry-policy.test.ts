import { describe, expect, it } from "vitest"
import { buildTestApp } from "../../test/support/build-app"
import { seedTenant } from "../../test/support/fixtures"
import { createMemoryDb } from "../../src/db/memory-db"
import { claimOutboxBatch } from "../../src/db/repositories/outbox"
import { insertOutboxEntry } from "../../src/db/repositories/outbox"
import { listDeadLettersForTenant } from "../../src/db/repositories/outbox"
import { createOutbox } from "../../src/queue/outbox"
import { cappedBackoffDelayMs } from "../../src/delivery/retry"
import { classifyDeliveryFailure } from "../../src/delivery/retry"
import { computeNextAttemptAt } from "../../src/delivery/retry"
import { DeliveryFailureError } from "../../src/delivery/retry"
import { hasReachedBackoffCap } from "../../src/delivery/retry"
import { jitteredBackoffDelayMs } from "../../src/delivery/retry"
import { parseRetryAfterSeconds } from "../../src/delivery/retry"

describe("classifyDeliveryFailure", () => {
  it("treats 429 and 503 as retryable", () => {
    expect(classifyDeliveryFailure({ statusCode: 429 })).toBe("retryable")
    expect(classifyDeliveryFailure({ statusCode: 503 })).toBe("retryable")
  })

  it("treats a network error (no status code at all) as retryable", () => {
    expect(classifyDeliveryFailure({ statusCode: null })).toBe("retryable")
  })

  it("treats an ordinary 400 as terminal - retrying the exact same request can never help", () => {
    expect(classifyDeliveryFailure({ statusCode: 400 })).toBe("terminal")
  })
})

describe("Retry-After", () => {
  it("is honored ahead of the default backoff schedule, regardless of attempt count", () => {
    const withoutHeader = computeNextAttemptAt({
      attemptCount: 5,
      retryAfterSeconds: null,
      now: "2026-01-01T00:00:00.000Z",
      timeZone: "UTC",
    })
    const withHeader = computeNextAttemptAt({
      attemptCount: 5,
      retryAfterSeconds: 45,
      now: "2026-01-01T00:00:00.000Z",
      timeZone: "UTC",
    })
    expect(withHeader).toBe("2026-01-01T00:00:45.000Z")
    expect(withHeader).not.toBe(withoutHeader)
  })

  it("parses a Retry-After header as seconds from now", () => {
    expect(parseRetryAfterSeconds({ "retry-after": "30" }, "2026-01-01T00:00:00.000Z")).toBe(30)
  })

  it("returns null when there is no Retry-After header at all", () => {
    expect(parseRetryAfterSeconds(undefined, "2026-01-01T00:00:00.000Z")).toBeNull()
  })
})

describe("capped exponential backoff with jitter applied after the cap", () => {
  it("grows exponentially between early attempts", () => {
    const first = cappedBackoffDelayMs(0)
    const second = cappedBackoffDelayMs(1)
    const third = cappedBackoffDelayMs(2)
    expect(second).toBeGreaterThan(first)
    expect(third).toBeGreaterThan(second)
  })

  it("never exceeds the maximum once the exponential term reaches it", () => {
    expect(cappedBackoffDelayMs(20)).toBe(cappedBackoffDelayMs(30))
  })

  it("jitter is added ON TOP of the capped value, never below it, even far past the cap", () => {
    for (const randomValue of [0, 0.25, 0.5, 0.75, 0.999]) {
      const capped = cappedBackoffDelayMs(20)
      const jittered = jitteredBackoffDelayMs(20, undefined, () => randomValue)
      expect(jittered).toBeGreaterThanOrEqual(capped)
    }
  })
})

describe("computeNextAttemptAt's daily cooldown - MER-202 payoff", () => {
  it("settles into a once-a-day cooldown once the exponential schedule has reached its cap", () => {
    expect(hasReachedBackoffCap(0)).toBe(false)
    expect(hasReachedBackoffCap(20)).toBe(true)
  })

  it("lands on the start of the tenant's next calendar day once the cap is reached", () => {
    const nextAttempt = computeNextAttemptAt({
      attemptCount: 20,
      retryAfterSeconds: null,
      now: "2026-06-15T18:00:00.000Z",
      timeZone: "America/Chicago",
    })
    // Midnight local time in America/Chicago in June (CDT, UTC-5) is 05:00 UTC.
    expect(nextAttempt).toBe("2026-06-16T05:00:00.000Z")
  })
})

describe("retry state persists per delivery", () => {
  it("increments attempt_count and clears the lease on a retryable failure, without dropping the entry", async () => {
    const db = createMemoryDb()
    const outbox = createOutbox({ db, workerId: "worker-a", maxAttempts: 8 })
    await outbox.enqueue({ type: "claim.processed", tenantId: "ten_northwind", claimId: "clm_1" })

    await outbox.drain(async () => {
      throw new DeliveryFailureError({
        message: "503 from Northwind",
        classification: "retryable",
        nextAttemptAt: new Date(Date.now() + 5).toISOString(),
        payload: '{"claimId":"clm_1"}',
      })
    })

    expect(outbox.pendingCount()).toBe(1)

    await new Promise((resolve) => setTimeout(resolve, 20))
    const reclaimed = await outbox.drain(async () => {})
    expect(reclaimed).toBe(1)
  })

  it("stamps attempt_count and next_attempt_at onto the entry itself, inspectable after a failure", async () => {
    const db = createMemoryDb()
    const outbox = createOutbox({ db, workerId: "worker-a", maxAttempts: 8 })
    await outbox.enqueue({
      type: "claim.processed",
      tenantId: "ten_northwind",
      claimId: "clm_inspect",
    })

    await outbox.drain(async () => {
      throw new DeliveryFailureError({
        message: "503",
        classification: "retryable",
        nextAttemptAt: new Date(Date.now() + 5).toISOString(),
        payload: "{}",
      })
    })
    await new Promise((resolve) => setTimeout(resolve, 20))

    const claimed = await claimOutboxBatch(db, {
      workerId: "inspector",
      leaseDurationMs: 30_000,
      limit: 10,
    })
    expect(claimed).toHaveLength(1)
    expect(claimed[0].attemptCount).toBe(1)
  })

  it("survives a restart: a fresh Outbox against the same db still honors the persisted schedule", async () => {
    const db = createMemoryDb()
    const outboxBeforeRestart = createOutbox({ db, workerId: "worker-a", maxAttempts: 8 })
    await outboxBeforeRestart.enqueue({
      type: "claim.processed",
      tenantId: "ten_northwind",
      claimId: "clm_2",
    })
    await outboxBeforeRestart.drain(async () => {
      throw new DeliveryFailureError({
        message: "503 from Northwind",
        classification: "retryable",
        nextAttemptAt: new Date(Date.now() + 10_000).toISOString(),
        payload: "{}",
      })
    })

    // A fresh instance - its own in-process gauge would start at zero, but the schedule itself
    // (attempt_count, next_attempt_at) lives in the durable table, not the process.
    const outboxAfterRestart = createOutbox({ db, workerId: "worker-b", maxAttempts: 8 })
    const tooSoon = await outboxAfterRestart.drain(async () => {})
    expect(tooSoon).toBe(0)
  })
})

describe("a delivery that exhausts its retry budget is dead-lettered with its payload intact", () => {
  it("dead-letters once attempt_count reaches the maximum, never dropping the payload", async () => {
    const db = createMemoryDb()
    const outbox = createOutbox({ db, workerId: "worker-a", maxAttempts: 2 })
    await insertOutboxEntry(db, {
      type: "claim.processed",
      tenantId: "ten_northwind",
      claimId: "clm_3",
    })

    const alwaysFails = async () => {
      throw new DeliveryFailureError({
        message: "503 from Northwind",
        classification: "retryable",
        nextAttemptAt: new Date(Date.now() + 5).toISOString(),
        payload: '{"claimId":"clm_3","amount":100}',
      })
    }

    await outbox.drain(alwaysFails)
    await new Promise((resolve) => setTimeout(resolve, 20))
    await outbox.drain(alwaysFails)

    expect(outbox.pendingCount()).toBe(0)
    const deadLetters = await listDeadLettersForTenant(db, "ten_northwind")
    expect(deadLetters).toHaveLength(1)
    expect(deadLetters[0].payload).toBe('{"claimId":"clm_3","amount":100}')
    expect(deadLetters[0].attemptCount).toBe(2)
  })

  it("dead-letters immediately on a terminal classification, regardless of attempt count", async () => {
    const db = createMemoryDb()
    const outbox = createOutbox({ db, workerId: "worker-a", maxAttempts: 8 })
    await outbox.enqueue({ type: "claim.processed", tenantId: "ten_northwind", claimId: "clm_4" })

    await outbox.drain(async () => {
      throw new DeliveryFailureError({
        message: "400 from Northwind",
        classification: "terminal",
        nextAttemptAt: new Date().toISOString(),
        payload: "{}",
      })
    })

    expect(outbox.pendingCount()).toBe(0)
    const deadLetters = await listDeadLettersForTenant(db, "ten_northwind")
    expect(deadLetters).toHaveLength(1)
    expect(deadLetters[0].attemptCount).toBe(1)
  })

  it("one failing entry never blocks the rest of the batch", async () => {
    const db = createMemoryDb()
    const outbox = createOutbox({ db, workerId: "worker-a", maxAttempts: 8 })
    await outbox.enqueue({
      type: "claim.processed",
      tenantId: "ten_northwind",
      claimId: "clm_fails",
    })
    await outbox.enqueue({
      type: "claim.processed",
      tenantId: "ten_northwind",
      claimId: "clm_succeeds",
    })

    const delivered: string[] = []
    await outbox.drain(async (entry) => {
      if (entry.claimId === "clm_fails") {
        throw new DeliveryFailureError({
          message: "503",
          classification: "retryable",
          nextAttemptAt: new Date(Date.now() + 60_000).toISOString(),
          payload: "{}",
        })
      }
      delivered.push(entry.claimId)
    })

    expect(delivered).toEqual(["clm_succeeds"])
  })
})

describe("end to end through the webhook delivery path", () => {
  it("honors a real Retry-After header from a 503 response, then succeeds on the next attempt", async () => {
    const { meridian } = buildTestApp({
      webhookResponses: [{ status: 503, headers: { "retry-after": "1" } }, { status: 200 }],
    })
    await seedTenant(meridian.db, {
      id: "ten_northwind",
      webhookUrl: "https://northwind.example.com/webhooks",
      webhookSecret: "shh",
    })
    await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-RETRY",
        amount: 100,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })

    const firstDrain = await meridian.drainOutbox()
    expect(firstDrain).toBe(1)
    expect(meridian.outbox.pendingCount()).toBe(1)

    const tooSoon = await meridian.drainOutbox()
    expect(tooSoon).toBe(0)

    await new Promise((resolve) => setTimeout(resolve, 1100))
    const secondDrain = await meridian.drainOutbox()
    expect(secondDrain).toBe(1)
    expect(meridian.outbox.pendingCount()).toBe(0)
  })
})
