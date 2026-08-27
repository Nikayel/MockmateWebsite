import { describe, expect, it } from "vitest"
import { buildTestApp } from "../support/build-app"
import { insertDocument } from "../../src/db/repositories/documents"

describe("GET /claims/:id/documents", () => {
  it("returns documents attached to a claim", async () => {
    const { meridian } = buildTestApp()
    const created = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_a" },
      payload: {
        externalRef: "A-1",
        amount: 100,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })
    const { id: claimId } = created.json<{ id: string }>()
    await insertDocument(meridian.db, {
      claimId,
      fileName: "estimate.pdf",
      contentType: "application/pdf",
      legacyPath: `/var/meridian/uploads/${claimId}/estimate.pdf`,
    })

    const response = await meridian.app.inject({
      method: "GET",
      url: `/claims/${claimId}/documents`,
    })

    const body = response.json<{ documents: Array<{ fileName: string }> }>()
    expect(body.documents).toHaveLength(1)
    expect(body.documents[0].fileName).toBe("estimate.pdf")
  })

  it("returns an empty list when a claim has no documents", async () => {
    const { meridian } = buildTestApp()
    const created = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_a" },
      payload: {
        externalRef: "A-2",
        amount: 100,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })
    const { id: claimId } = created.json<{ id: string }>()

    const response = await meridian.app.inject({
      method: "GET",
      url: `/claims/${claimId}/documents`,
    })

    const body = response.json<{ documents: unknown[] }>()
    expect(body.documents).toHaveLength(0)
  })
})
