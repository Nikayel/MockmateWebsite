import { describe, expect, it } from "vitest"
import type { DbClient } from "../../src/db/client"
import { createMemoryDb } from "../../src/db/memory-db"
import { insertDocument } from "../../src/db/repositories/documents"
import { getDocumentsForClaims } from "../../src/db/repositories/documents"

function spyOnQueries(db: DbClient): { db: DbClient; count: () => number } {
  let calls = 0
  return {
    db: {
      query: (sql, params) => {
        calls += 1
        return db.query(sql, params)
      },
    },
    count: () => calls,
  }
}

describe("getDocumentsForClaims issues a bounded number of queries", () => {
  it("fetches documents for five claims in exactly one query, not five", async () => {
    const db = createMemoryDb()
    const claimIds = ["clm_1", "clm_2", "clm_3", "clm_4", "clm_5"]
    for (const claimId of claimIds) {
      await insertDocument(db, {
        claimId,
        fileName: `${claimId}.pdf`,
        contentType: "application/pdf",
        legacyPath: `/x/${claimId}`,
      })
    }

    const spy = spyOnQueries(db)
    const result = await getDocumentsForClaims(spy.db, claimIds)

    expect(spy.count()).toBe(1)
    for (const claimId of claimIds) {
      expect(result[claimId]).toHaveLength(1)
      expect(result[claimId][0].fileName).toBe(`${claimId}.pdf`)
    }
  })

  it("still issues exactly one query for fifty claims", async () => {
    const db = createMemoryDb()
    const claimIds = Array.from({ length: 50 }, (_, i) => `clm_${i}`)

    const spy = spyOnQueries(db)
    await getDocumentsForClaims(spy.db, claimIds)

    expect(spy.count()).toBe(1)
  })

  it("issues zero queries for an empty page", async () => {
    const db = createMemoryDb()
    const spy = spyOnQueries(db)

    await getDocumentsForClaims(spy.db, [])

    expect(spy.count()).toBe(0)
  })

  it("every claim id on the page gets an entry, even ones with no documents at all", async () => {
    const db = createMemoryDb()
    await insertDocument(db, {
      claimId: "clm_has_docs",
      fileName: "estimate.pdf",
      contentType: "application/pdf",
      legacyPath: "/x",
    })

    const result = await getDocumentsForClaims(db, ["clm_has_docs", "clm_no_docs"])

    expect(result.clm_has_docs).toHaveLength(1)
    expect(result.clm_no_docs).toEqual([])
  })
})
