import { describe, expect, it, vi } from "vitest"
import { buildMetadataFilter } from "../vectordb/pinecone-adapter/filters"
import { flattenMetadata, restoreMetadata } from "../vectordb/pinecone-adapter/metadata"
import type { VectorDocument } from "../types"

const mocks = vi.hoisted(() => ({
  namespace: vi.fn(),
  getVerifiedPineconeIndex: vi.fn(),
}))

vi.mock("../vectordb/pinecone-adapter/client", () => ({
  getPineconeClient: vi.fn(),
  getVerifiedPineconeIndex: mocks.getVerifiedPineconeIndex,
}))

describe("Pinecone adapter helpers", () => {
  describe("buildMetadataFilter", () => {
    it("maps supported filters to Pinecone metadata filters", () => {
      expect(
        buildMetadataFilter({
          type: "solution",
          userId: "user-1",
          problemType: "dsa",
          excludeIds: ["ignored-client-side"],
        })
      ).toEqual({
        $and: [
          { type: { $eq: "solution" } },
          { $or: [{ userId: { $eq: "user-1" } }, { user_id: { $eq: "user-1" } }] },
          { problemType: { $eq: "dsa" } },
        ],
      })
    })

    it("returns undefined when no server-side filters are present", () => {
      expect(buildMetadataFilter({ excludeIds: ["doc-1"], minSimilarity: 0.5 })).toBeUndefined()
    })
  })

  describe("metadata conversion", () => {
    it("flattens Pinecone metadata and restores known structured fields", () => {
      const document: VectorDocument = {
        id: "doc-1",
        text: "Stored text",
        vector: [0.1, 0.2],
        metadata: {
          type: "company",
          tags: ["arrays", "hash-map"],
          topPatterns: ["two-pointers", "sliding-window"],
          difficultyDistribution: {
            easy: 1,
            medium: 2,
            hard: 3,
          },
          nested: {
            source: "fixture",
          },
        },
      }

      const flattened = flattenMetadata(document)

      expect(flattened).toMatchObject({
        text: "Stored text",
        tags: "arrays,hash-map",
        topPatterns: "two-pointers,sliding-window",
        difficultyDistribution: "easy:1,medium:2,hard:3",
        nested: JSON.stringify({ source: "fixture" }),
      })

      expect(restoreMetadata(flattened)).toMatchObject({
        text: "Stored text",
        tags: ["arrays", "hash-map"],
        topPatterns: ["two-pointers", "sliding-window"],
        difficultyDistribution: {
          easy: 1,
          medium: 2,
          hard: 3,
        },
        nested: JSON.stringify({ source: "fixture" }),
      })
    })
  })

  describe("PineconeVectorDB", () => {
    it("groups mixed-type upserts by namespace", async () => {
      const upsertsByNamespace = new Map<string, ReturnType<typeof vi.fn>>()
      mocks.namespace.mockImplementation((namespace: string) => {
        const upsert = vi.fn().mockResolvedValue(undefined)
        upsertsByNamespace.set(namespace, upsert)
        return { upsert }
      })
      mocks.getVerifiedPineconeIndex.mockImplementation(async (_indexName, onDimension) => {
        onDimension(2)
        return { namespace: mocks.namespace }
      })

      const { PineconeVectorDB } = await import("../vectordb/pinecone-adapter/pinecone-vector-db")
      const db = new PineconeVectorDB()

      await db.upsert([
        {
          id: "problem-1",
          vector: [0.1, 0.2],
          text: "Problem",
          metadata: { type: "problem" },
        },
        {
          id: "hint-1",
          vector: [0.3, 0.4],
          text: "Hint",
          metadata: { type: "hint" },
        },
      ])

      expect(mocks.namespace).toHaveBeenCalledWith("mockmate_problem")
      expect(mocks.namespace).toHaveBeenCalledWith("mockmate_hint")
      expect(upsertsByNamespace.get("mockmate_problem")).toHaveBeenCalledWith([
        expect.objectContaining({ id: "problem-1" }),
      ])
      expect(upsertsByNamespace.get("mockmate_hint")).toHaveBeenCalledWith([
        expect.objectContaining({ id: "hint-1" }),
      ])
    })
  })
})
