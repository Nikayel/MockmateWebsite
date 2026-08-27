import { describe, expect, it } from "vitest"
import { createMemoryDb } from "../../src/db/memory-db"
import { createOutbox } from "../../src/queue/outbox"
import { insertOutboxEntry } from "../../src/db/repositories/outbox"
import { claimOutboxBatch } from "../../src/db/repositories/outbox"
import { listDeadLettersForTenant } from "../../src/db/repositories/outbox"
import { DeliveryFailureError } from "../../src/delivery/retry"

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe("per-claim ordering survives a retry", () => {
  it("never claims a claim's later event while an earlier one for the same claim is still outstanding", async () => {
    const db = createMemoryDb()
    await insertOutboxEntry(db, {
      type: "claim.processed",
      tenantId: "ten_northwind",
      claimId: "clm_9001",
    })
    await sleep(5)
    await insertOutboxEntry(db, {
      type: "claim.processed",
      tenantId: "ten_northwind",
      claimId: "clm_9001",
    })

    const firstBatch = await claimOutboxBatch(db, {
      workerId: "w1",
      leaseDurationMs: 30_000,
      limit: 10,
    })
    expect(firstBatch).toHaveLength(1)

    // The first event is still leased (not yet delivered) - the second event for the SAME claim
    // must not be claimable by anyone else, even though nothing prevents it individually.
    const secondBatch = await claimOutboxBatch(db, {
      workerId: "w2",
      leaseDurationMs: 30_000,
      limit: 10,
    })
    expect(secondBatch).toHaveLength(0)
  })

  it("delivers CLM-9001's two events in the order they were produced, even though the first had to be retried", async () => {
    const db = createMemoryDb()
    const outbox = createOutbox({ db, workerId: "w1", maxAttempts: 8 })
    await outbox.enqueue({
      type: "claim.processed",
      tenantId: "ten_northwind",
      claimId: "clm_9001",
    })
    await sleep(5)
    await outbox.enqueue({
      type: "claim.processed",
      tenantId: "ten_northwind",
      claimId: "clm_9001",
    })

    const deliveredOrder: string[] = []
    let firstAttempt = true

    // Attempt 1: the head-of-line entry fails and is rescheduled.
    await outbox.drain(async (entry) => {
      deliveredOrder.push(entry.id)
      if (firstAttempt) {
        firstAttempt = false
        throw new DeliveryFailureError({
          message: "503",
          classification: "retryable",
          nextAttemptAt: new Date(Date.now() + 10).toISOString(),
          payload: "{}",
        })
      }
    })
    expect(deliveredOrder).toHaveLength(1)

    // Immediately after: the second event must not be claimable while the first is on backoff.
    const tooSoon = await outbox.drain(async (entry) => {
      deliveredOrder.push(entry.id)
    })
    expect(tooSoon).toBe(0)

    await sleep(30)
    // Attempt 2: the first event succeeds this time.
    await outbox.drain(async (entry) => {
      deliveredOrder.push(entry.id)
    })
    // Now that the first event is delivered, the second becomes the new head of line.
    await outbox.drain(async (entry) => {
      deliveredOrder.push(entry.id)
    })

    expect(deliveredOrder).toHaveLength(3)
    expect(deliveredOrder[0]).toBe(deliveredOrder[1]) // the same entry, retried
    expect(deliveredOrder[2]).not.toBe(deliveredOrder[0]) // the second, distinct event, delivered last
  })

  it("a dead-lettered head-of-line entry still lets the claim's next event through", async () => {
    const db = createMemoryDb()
    const outbox = createOutbox({ db, workerId: "w1", maxAttempts: 1 })
    await insertOutboxEntry(db, {
      type: "claim.processed",
      tenantId: "ten_northwind",
      claimId: "clm_9002",
    })
    await sleep(5)
    await insertOutboxEntry(db, {
      type: "claim.processed",
      tenantId: "ten_northwind",
      claimId: "clm_9002",
    })

    await outbox.drain(async () => {
      throw new DeliveryFailureError({
        message: "400 terminal",
        classification: "terminal",
        nextAttemptAt: new Date().toISOString(),
        payload: "{}",
      })
    })
    const deadLetters = await listDeadLettersForTenant(db, "ten_northwind")
    expect(deadLetters).toHaveLength(1)

    const delivered: string[] = []
    const claimedCount = await outbox.drain(async (entry) => {
      delivered.push(entry.id)
    })
    expect(claimedCount).toBe(1)
    expect(delivered).toHaveLength(1)
  })
})

describe("ordering is per-claim, not global", () => {
  it("two different claims' deliveries have no required order relative to each other", async () => {
    const db = createMemoryDb()
    const outbox = createOutbox({ db, workerId: "w1" })
    await outbox.enqueue({
      type: "claim.processed",
      tenantId: "ten_a",
      claimId: "clm_first_enqueued",
    })
    await sleep(5)
    await outbox.enqueue({
      type: "claim.processed",
      tenantId: "ten_b",
      claimId: "clm_second_enqueued",
    })

    const finishOrder: string[] = []
    await outbox.drain(async (entry) => {
      if (entry.claimId === "clm_second_enqueued") {
        finishOrder.push(entry.claimId)
      } else {
        await sleep(20)
        finishOrder.push(entry.claimId)
      }
    })

    // The claim enqueued SECOND finishes FIRST - not a bug, since they are different claims and
    // this codebase makes no promise about their relative order.
    expect(finishOrder).toEqual(["clm_second_enqueued", "clm_first_enqueued"])
  })
})

describe("one slow or unreachable destination does not delay an unrelated claim", () => {
  it("a fast lane completes without waiting on a slow lane sharing the same drain cycle", async () => {
    const db = createMemoryDb()
    const outbox = createOutbox({ db, workerId: "w1" })
    await outbox.enqueue({ type: "claim.processed", tenantId: "ten_slow", claimId: "clm_slow" })
    await outbox.enqueue({ type: "claim.processed", tenantId: "ten_fast", claimId: "clm_fast" })

    const start = Date.now()
    let fastFinishedAt = -1
    let slowFinishedAt = -1
    await outbox.drain(async (entry) => {
      if (entry.claimId === "clm_slow") {
        await sleep(200)
        slowFinishedAt = Date.now() - start
      } else {
        fastFinishedAt = Date.now() - start
      }
    })

    expect(fastFinishedAt).toBeGreaterThanOrEqual(0)
    expect(fastFinishedAt).toBeLessThan(slowFinishedAt)
  })

  it("delivery p95 is bounded by the slowest single lane, not the sum of every lane sharing the batch", async () => {
    const db = createMemoryDb()
    const outbox = createOutbox({ db, workerId: "w1" })
    const laneCount = 10
    for (let i = 0; i < laneCount; i++) {
      await outbox.enqueue({ type: "claim.processed", tenantId: "ten_a", claimId: `clm_${i}` })
    }

    const start = Date.now()
    await outbox.drain(async () => {
      await sleep(50)
    })
    const elapsed = Date.now() - start

    // A sequential drain would take roughly laneCount * 50ms; concurrent lanes take roughly one
    // lane's worth of time, no matter how many share the batch.
    expect(elapsed).toBeLessThan(laneCount * 25)
  })
})
