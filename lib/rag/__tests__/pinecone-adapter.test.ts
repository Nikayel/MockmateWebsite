import { describe, expect, it } from "vitest"
import { buildMetadataFilter } from "../vectordb/pinecone-adapter/filters"
import { flattenMetadata, restoreMetadata } from "../vectordb/pinecone-adapter/metadata"
import type { VectorDocument } from "../types"

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
})
