import { describe, expect, it } from "vitest"
import { buildTestApp } from "../../test/support/build-app"
import { seedTenant } from "../../test/support/fixtures"
import { createFailingQueryDb } from "../../test/support/failing-query-db"
import { createMemoryDb } from "../../src/db/memory-db"
import { INSERT_OUTBOX_ENTRY } from "../../src/db/queries"
import { claimOutboxBatch, insertOutboxEntry } from "../../src/db/repositories/outbox"
import { findIdempotencyKey } from "../../src/db/repositories/idempotency-keys"
import { createOutbox } from "../../src/queue/outbox"

describe("the transactional outbox", () => {
  it("commits a claim and its outbox event together, and drains it end to end", async () => {
    const { meridian, httpClient } = buildTestApp()
    await seedTenant(meridian.db, {
      id: "ten_northwind",
      webhookUrl: "https://northwind.example.com/webhooks",
      webhookSecret: "shh",
    })

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-402",
        amount: 100,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })

    expect(response.statusCode).toBe(201)
    expect(meridian.outbox.pendingCount()).toBe(1)

    const drained = await meridian.drainOutbox()
    expect(drained).toBe(1)
    expect(httpClient.calls).toHaveLength(1)
  })

  it("rolls back the claim write if the outbox write inside the same transaction fails", async () => {
    const realDb = createMemoryDb()
    const failingDb = createFailingQueryDb(realDb, INSERT_OUTBOX_ENTRY)
    const { meridian } = buildTestApp({ db: failingDb })

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-ROLLBACK",
        amount: 100,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })

    expect(response.statusCode).toBe(500)

    const listResponse = await meridian.app.inject({
      method: "GET",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
    })
    const body = listResponse.json<{ claims: Array<{ externalRef: string }> }>()
    expect(body.claims.some((claim) => claim.externalRef === "NW-ROLLBACK")).toBe(false)
  })

  it("commits a payment authorization's idempotency record and its outbox event together too", async () => {
    const { meridian } = buildTestApp()
    const created = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-402-PA",
        amount: 100,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })
    const claimId = created.json<{ id: string }>().id
    await meridian.drainOutbox()

    const response = await meridian.app.inject({
      method: "POST",
      url: `/claims/${claimId}/payment-authorizations`,
      headers: { "x-tenant-id": "ten_northwind", "idempotency-key": "pa-transaction-key" },
      payload: { approvedBy: "adjuster_test" },
    })

    expect(response.statusCode).toBe(201)
    expect(meridian.outbox.pendingCount()).toBe(1)
    const record = await findIdempotencyKey(meridian.db, "ten_northwind", "pa-transaction-key")
    expect(record).not.toBeNull()
  })

  it("an enqueued event survives a restart: a fresh Outbox against the same db still delivers it", async () => {
    const db = createMemoryDb()
    const outboxBeforeRestart = createOutbox({ db, workerId: "worker-a" })
    await outboxBeforeRestart.enqueue({
      type: "claim.processed",
      tenantId: "ten_northwind",
      claimId: "clm_1",
    })
    expect(outboxBeforeRestart.pendingCount()).toBe(1)

    // A fresh instance against the SAME db - its own in-process gauge starts at zero, the way a
    // real restart would lose an in-memory counter, but the durable row is still there to claim.
    const outboxAfterRestart = createOutbox({ db, workerId: "worker-b" })
    expect(outboxAfterRestart.pendingCount()).toBe(0)

    let delivered = 0
    const drainedCount = await outboxAfterRestart.drain(async () => {
      delivered += 1
    })

    expect(drainedCount).toBe(1)
    expect(delivered).toBe(1)
  })

  it("two workers draining the same backlog concurrently never claim overlapping batches", async () => {
    const db = createMemoryDb()
    for (let i = 0; i < 6; i++) {
      await insertOutboxEntry(db, {
        type: "claim.processed",
        tenantId: "ten_northwind",
        claimId: `clm_${i}`,
      })
    }

    const [batchA, batchB] = await Promise.all([
      claimOutboxBatch(db, { workerId: "worker-a", leaseDurationMs: 30_000, limit: 4 }),
      claimOutboxBatch(db, { workerId: "worker-b", leaseDurationMs: 30_000, limit: 4 }),
    ])

    const idsA = new Set(batchA.map((entry) => entry.id))
    const idsB = new Set(batchB.map((entry) => entry.id))
    const overlap = [...idsA].filter((id) => idsB.has(id))

    expect(batchA.length + batchB.length).toBe(6)
    expect(overlap).toEqual([])
  })

  it("a worker that dies mid-delivery releases its claimed entry once the lease expires, not before", async () => {
    const db = createMemoryDb()
    await insertOutboxEntry(db, {
      type: "claim.processed",
      tenantId: "ten_northwind",
      claimId: "clm_stuck",
    })

    const claimedByDeadWorker = await claimOutboxBatch(db, {
      workerId: "worker-dead",
      leaseDurationMs: 10,
      limit: 10,
    })
    expect(claimedByDeadWorker).toHaveLength(1)

    const tooSoon = await claimOutboxBatch(db, {
      workerId: "worker-live",
      leaseDurationMs: 30_000,
      limit: 10,
    })
    expect(tooSoon).toHaveLength(0)

    await new Promise((resolve) => setTimeout(resolve, 30))

    const afterLeaseExpires = await claimOutboxBatch(db, {
      workerId: "worker-live",
      leaseDurationMs: 30_000,
      limit: 10,
    })
    expect(afterLeaseExpires).toHaveLength(1)
    expect(afterLeaseExpires[0].id).toBe(claimedByDeadWorker[0].id)
  })
})
