import { beforeEach, describe, expect, it, vi } from "vitest"
import { adminDb } from "@/lib/firebase-admin"
import { FirestoreVectorDB } from "../vectordb/firestore"

function createSnapshot(
  docs: Array<{
    id: string
    data: Record<string, unknown>
  }>
) {
  return {
    forEach: (callback: (doc: { id: string; data: () => Record<string, unknown> }) => void) => {
      docs.forEach((doc) => callback({ id: doc.id, data: () => doc.data }))
    },
  }
}

describe("FirestoreVectorDB", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("normalizes nested and legacy flat metadata while querying", async () => {
    const query = {
      limit: vi.fn(),
      where: vi.fn(),
      get: vi.fn(),
    }
    query.limit.mockReturnValue(query)
    query.where.mockReturnValue(query)
    query.get.mockResolvedValue(
      createSnapshot([
        {
          id: "new-doc",
          data: {
            vector: [1, 0],
            text: "new document",
            type: "problem",
            metadata: {
              type: "problem",
              userId: "user-1",
              tags: ["dsa"],
            },
          },
        },
        {
          id: "legacy-doc",
          data: {
            vector: [0.9, 0.1],
            text: "legacy document",
            type: "problem",
            userId: "user-1",
            tags: ["dsa"],
          },
        },
      ])
    )

    vi.mocked(adminDb.collection).mockReturnValue(query as never)

    const db = new FirestoreVectorDB()
    const results = await db.query([1, 0], {
      topK: 5,
      filter: { type: "problem", userId: "user-1", problemType: "dsa" },
      includeMetadata: true,
    })

    expect(query.where).toHaveBeenCalledWith("type", "==", "problem")
    expect(results.map((result) => result.id)).toEqual(["new-doc", "legacy-doc"])
    expect(results[0].metadata).toMatchObject({ type: "problem", userId: "user-1" })
    expect(results[1].metadata).toMatchObject({ type: "problem", userId: "user-1" })
  })
})
