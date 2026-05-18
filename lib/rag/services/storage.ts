import { Timestamp } from "firebase-admin/firestore"
import { adminDb } from "../../firebase-admin"
import { getVectorDBProvider, isPineconeEnabled, vectorDB } from "../vectordb"
import type { TextEmbedding, VectorDocument } from "../types"
import { removeUndefinedValues } from "./helpers"

export { removeUndefinedValues }

export async function storeTextEmbedding(embedding: TextEmbedding): Promise<string> {
  try {
    const timestamp = embedding.metadata.timestamp
      ? Timestamp.fromDate(new Date(embedding.metadata.timestamp))
      : Timestamp.now()

    const timestampStr = timestamp.toDate().toISOString()
    const docId =
      embedding.id ||
      `${embedding.type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    const cleanedMetadata = removeUndefinedValues({
      ...embedding.metadata,
      type: embedding.type,
      timestamp: timestampStr,
    })

    const vectorDoc: VectorDocument = {
      id: docId,
      vector: embedding.vector,
      text: embedding.text,
      metadata: cleanedMetadata,
    }

    await vectorDB.upsert([vectorDoc])

    if (isPineconeEnabled()) {
      try {
        await adminDb
          .collection("text_embeddings")
          .doc(docId)
          .set({
            text: embedding.text,
            type: embedding.type,
            vectorStoredIn: "pinecone",
            metadata: removeUndefinedValues({
              ...embedding.metadata,
              timestamp: timestampStr,
            }),
            createdAt: Timestamp.now(),
          })
      } catch (firestoreError) {
        console.warn("[RAG] Failed to backup metadata to Firestore:", firestoreError)
      }
    }

    console.log(
      `[RAG] Stored embedding ${docId} (type: ${embedding.type}) in ${getVectorDBProvider()}`
    )
    return docId
  } catch (error) {
    console.error("Error storing text embedding:", error)
    throw error
  }
}
