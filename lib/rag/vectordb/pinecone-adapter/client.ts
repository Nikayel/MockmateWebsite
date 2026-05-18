import { Pinecone } from "@pinecone-database/pinecone"
import { GEMINI_DIM, OPENAI_DIM, SUPPORTED_DIMENSIONS, TFIDF_DIM } from "./config"

let pineconeClient: Pinecone | null = null

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY
    if (!apiKey) {
      throw new Error("PINECONE_API_KEY environment variable is required")
    }
    pineconeClient = new Pinecone({ apiKey })
  }
  return pineconeClient
}

export async function getVerifiedPineconeIndex(
  indexName: string,
  onDimensionResolved: (dimension: number) => void
) {
  const client = getPineconeClient()

  try {
    const indexList = await client.listIndexes()
    const indexInfo = indexList.indexes?.find((idx) => idx.name === indexName)

    if (!indexInfo) {
      throw new Error(
        `Pinecone index '${indexName}' does not exist. ` +
          `Please create it by running: npx ts-node scripts/setup-pinecone.ts ` +
          `or set PINECONE_INDEX_NAME to an existing index name.`
      )
    }

    const dimension = indexInfo.dimension
    if (
      !dimension ||
      !SUPPORTED_DIMENSIONS.includes(dimension as (typeof SUPPORTED_DIMENSIONS)[number])
    ) {
      throw new Error(
        `Pinecone index '${indexName}' has unsupported dimensions. ` +
          `Supported dimensions: ${SUPPORTED_DIMENSIONS.join(", ")} (256 for TF-IDF, 768 for Gemini, 1536 for OpenAI). ` +
          `Index has ${dimension ?? "unknown"} dimensions. ` +
          `Please delete the existing index and create a new one with one of the supported dimensions, ` +
          `or update your embedding provider to match the index dimensions.`
      )
    }

    onDimensionResolved(dimension)

    if (dimension === GEMINI_DIM) {
      console.log("[Pinecone] Index configured for Gemini embeddings (768 dimensions)")
    } else if (dimension === OPENAI_DIM) {
      console.log("[Pinecone] Index configured for OpenAI embeddings (1536 dimensions)")
    } else if (dimension === TFIDF_DIM) {
      console.log("[Pinecone] Index configured for TF-IDF embeddings (256 dimensions)")
    }
  } catch (error: any) {
    if (
      error.message?.includes("does not exist") ||
      error.message?.includes("dimension mismatch")
    ) {
      throw error
    }
    console.warn("[Pinecone] Could not verify index existence:", error.message)
  }

  return client.index(indexName)
}
