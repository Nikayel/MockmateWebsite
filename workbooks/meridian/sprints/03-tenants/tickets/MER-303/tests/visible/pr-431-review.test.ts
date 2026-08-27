import { describe, expect, it } from "vitest"
import { createConnectionPool, withTenant } from "../../src/db/tenant-context"
import { createMemoryDb } from "../../src/db/memory-db"

describe("PR #431 - claimed fix", () => {
  it("a released connection is available for the next tenant to acquire", async () => {
    const pool = createConnectionPool(createMemoryDb(), 1)

    await withTenant(pool, "ten_continental", async () => {})
    const next = pool.acquire("ten_bekins")

    expect(next.tenantId).toBe("ten_bekins")
  })
})

describe("PR #431 - the defect its own tests do not cover", () => {
  it("the reused connection's tenant tag does not survive a later, deferred reset from the connection it replaced", async () => {
    const pool = createConnectionPool(createMemoryDb(), 1)

    const first = pool.acquire("ten_continental")
    pool.release(first)
    const second = pool.acquire("ten_bekins")

    // A real request holding `second` yields at least once before it finishes (an awaited
    // query, if nothing else) - simulated here with a single microtask-queue yield.
    await Promise.resolve()

    expect(second.tenantId).toBe("ten_bekins")
  })
})
