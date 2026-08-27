import { describe, expect, it } from "vitest"
import { createMemoryDb } from "../../src/db/memory-db"
import { createConnectionPool, withTenant } from "../../src/db/tenant-context"

describe("connection pool tenant tagging", () => {
  it("a pool of size one never hands the next caller the previous caller's tenant id", async () => {
    const pool = createConnectionPool(createMemoryDb(), 1)

    const first = pool.acquire("ten_continental")
    expect(first.tenantId).toBe("ten_continental")
    pool.release(first)

    const second = pool.acquire("ten_bekins")
    expect(second.tenantId).toBe("ten_bekins")
  })

  it("withTenant releases the connection even when the callback throws", async () => {
    const pool = createConnectionPool(createMemoryDb(), 1)

    await expect(
      withTenant(pool, "ten_continental", async () => {
        throw new Error("boom")
      })
    ).rejects.toThrow("boom")

    const next = pool.acquire("ten_bekins")
    expect(next.tenantId).toBe("ten_bekins")
  })

  it("two sequential withTenant calls against a pool of one each see only their own tenant id", async () => {
    const pool = createConnectionPool(createMemoryDb(), 1)
    const seen: string[] = []

    await withTenant(pool, "ten_continental", async (connection) => {
      seen.push(connection.tenantId)
    })
    await withTenant(pool, "ten_bekins", async (connection) => {
      seen.push(connection.tenantId)
    })

    expect(seen).toEqual(["ten_continental", "ten_bekins"])
  })

  it("rejects a pool size below one", () => {
    expect(() => createConnectionPool(createMemoryDb(), 0)).toThrow()
  })
})
