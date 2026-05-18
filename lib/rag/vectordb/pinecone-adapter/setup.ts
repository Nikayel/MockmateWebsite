import { INDEX_NAME } from "./config"
import { getPineconeClient } from "./client"

export async function createPineconeIndex(
  dimension: number = 768,
  metric: "cosine" | "euclidean" | "dotproduct" = "cosine"
): Promise<void> {
  const client = getPineconeClient()
  const indexList = await client.listIndexes()
  const exists = indexList.indexes?.some((idx) => idx.name === INDEX_NAME)

  if (exists) {
    console.log(`[Pinecone] Index '${INDEX_NAME}' already exists`)
    return
  }

  await client.createIndex({
    name: INDEX_NAME,
    dimension,
    metric,
    spec: {
      serverless: {
        cloud: "aws",
        region: "us-east-1",
      },
    },
  })

  console.log(`[Pinecone] Created index '${INDEX_NAME}' with dimension ${dimension}`)

  let ready = false
  while (!ready) {
    const description = await client.describeIndex(INDEX_NAME)
    ready = description.status?.ready || false
    if (!ready) {
      console.log("[Pinecone] Waiting for index to be ready...")
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  console.log(`[Pinecone] Index '${INDEX_NAME}' is ready`)
}
