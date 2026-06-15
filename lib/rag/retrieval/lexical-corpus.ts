import { adminDb } from "@/lib/firebase-admin"
import { RETRIEVAL_CONFIG } from "../config"
import type { VectorContentType } from "../types"
import type { BM25Document } from "./bm25"

export interface LexicalCorpusOptions {
  types?: VectorContentType[]
  userId?: string
  excludeIds?: string[]
  limit?: number
}

const NON_METADATA_FIELDS = new Set([
  "vector",
  "text",
  "metadata",
  "createdAt",
  "updatedAt",
  "vectorStoredIn",
])

function normalizeStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string")
  if (typeof value === "string")
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  return undefined
}

function normalizeDocument(id: string, data: Record<string, unknown>): BM25Document {
  const nestedMetadata =
    data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, unknown>)
      : {}

  const flatMetadata = Object.fromEntries(
    Object.entries(data).filter(([key]) => !NON_METADATA_FIELDS.has(key))
  )

  const metadata: Record<string, unknown> = {
    ...flatMetadata,
    ...nestedMetadata,
    type: data.type || nestedMetadata.type || flatMetadata.type,
  }

  const tags = normalizeStringArray(metadata.tags)
  if (tags) metadata.tags = tags

  const text =
    (typeof data.text === "string" && data.text) ||
    (typeof metadata.text === "string" && metadata.text) ||
    (typeof metadata.content === "string" && metadata.content) ||
    ""

  return {
    id,
    text,
    type: metadata.type as string | undefined,
    metadata,
  }
}

function matchesLexicalOptions(document: BM25Document, options: LexicalCorpusOptions): boolean {
  if (options.excludeIds?.includes(document.id)) return false

  if (options.types?.length) {
    const docType = document.type || document.metadata?.type
    if (!options.types.includes(docType as VectorContentType)) return false
  }

  if (options.userId) {
    const docUserId = document.metadata?.userId || document.metadata?.user_id
    if (docUserId !== options.userId) return false
  }

  return true
}

export async function fetchLexicalCorpus(
  options: LexicalCorpusOptions = {}
): Promise<BM25Document[]> {
  const limit = options.limit || RETRIEVAL_CONFIG.hybridSearch.corpusFetchLimit
  let query: FirebaseFirestore.Query = adminDb.collection("text_embeddings")

  if (options.types?.length === 1) {
    query = query.where("type", "==", options.types[0])
  }

  if (options.userId) {
    query = query.where("metadata.userId", "==", options.userId)
  }

  query = query.limit(limit)

  const snapshot = await query.get()
  const documents: BM25Document[] = []

  snapshot.forEach((doc) => {
    const normalized = normalizeDocument(doc.id, doc.data() as Record<string, unknown>)
    if (matchesLexicalOptions(normalized, options)) {
      documents.push(normalized)
    }
  })

  return documents
}
