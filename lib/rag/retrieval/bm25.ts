import type { VectorContentType } from "../types"

export interface BM25Document {
  id: string
  text: string
  type?: VectorContentType | string
  metadata?: Record<string, unknown>
}

export interface BM25Result<T extends BM25Document = BM25Document> {
  document: T
  score: number
  normalizedScore: number
  matchedTerms: string[]
}

export interface BM25Options {
  k1?: number
  b?: number
  limit?: number
  minScore?: number
}

const DEFAULT_K1 = 1.5
const DEFAULT_B = 0.75

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
])

export function tokenizeForBM25(text: string): string[] {
  const rawTokens = text
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .match(/[a-z0-9+#.-]+/g)

  if (!rawTokens) return []

  const tokens: string[] = []
  for (const token of rawTokens) {
    const cleaned = token.replace(/^[^\w+#]+|[^\w+#]+$/g, "")
    if (!cleaned || STOP_WORDS.has(cleaned)) continue

    tokens.push(cleaned)

    if (cleaned.includes("-") || cleaned.includes(".")) {
      for (const part of cleaned.split(/[-.]/)) {
        if (part && !STOP_WORDS.has(part)) tokens.push(part)
      }
    }
  }

  return tokens
}

function stringifyMetadataValue(value: unknown): string {
  if (value == null) return ""
  if (Array.isArray(value)) return value.map(stringifyMetadataValue).filter(Boolean).join(" ")
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object") return Object.values(value).map(stringifyMetadataValue).join(" ")
  return String(value)
}

export function buildBM25DocumentText(document: BM25Document): string {
  const metadata = document.metadata || {}
  const weightedFields = [
    metadata.title,
    metadata.problemTitle,
    metadata.problemId,
    metadata.pattern,
    metadata.difficulty,
    metadata.company,
    metadata.companyId,
    metadata.companies,
    metadata.companyIds,
    metadata.tags,
    metadata.timeComplexity,
    metadata.spaceComplexity,
  ]
    .map(stringifyMetadataValue)
    .filter(Boolean)
    .join(" ")

  // Repeat high-signal metadata once so exact titles, tags, patterns, and constraints matter.
  return [weightedFields, weightedFields, document.text, metadata.text, metadata.content]
    .map(stringifyMetadataValue)
    .filter(Boolean)
    .join("\n")
}

function countTerms(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1)
  }
  return counts
}

export function rankBM25<T extends BM25Document>(
  query: string,
  documents: T[],
  options: BM25Options = {}
): BM25Result<T>[] {
  const queryTerms = Array.from(new Set(tokenizeForBM25(query)))
  if (queryTerms.length === 0 || documents.length === 0) return []

  const k1 = options.k1 ?? DEFAULT_K1
  const b = options.b ?? DEFAULT_B
  const tokenizedDocs = documents.map((document) => {
    const tokens = tokenizeForBM25(buildBM25DocumentText(document))
    return {
      document,
      tokens,
      termCounts: countTerms(tokens),
      length: tokens.length,
    }
  })

  const avgDocLength =
    tokenizedDocs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(1, tokenizedDocs.length)

  const documentFrequency = new Map<string, number>()
  for (const term of queryTerms) {
    let count = 0
    for (const doc of tokenizedDocs) {
      if (doc.termCounts.has(term)) count++
    }
    documentFrequency.set(term, count)
  }

  const scored = tokenizedDocs
    .map((doc) => {
      let score = 0
      const matchedTerms: string[] = []

      for (const term of queryTerms) {
        const frequency = doc.termCounts.get(term) || 0
        if (frequency === 0) continue

        matchedTerms.push(term)
        const docsWithTerm = documentFrequency.get(term) || 0
        const idf = Math.log(1 + (documents.length - docsWithTerm + 0.5) / (docsWithTerm + 0.5))
        const denominator = frequency + k1 * (1 - b + b * (doc.length / avgDocLength))
        score += idf * ((frequency * (k1 + 1)) / denominator)
      }

      return {
        document: doc.document,
        score,
        normalizedScore: 0,
        matchedTerms,
      }
    })
    .filter((result) => result.score > (options.minScore || 0))

  const maxScore = Math.max(...scored.map((result) => result.score), 0)

  return scored
    .map((result) => ({
      ...result,
      normalizedScore: maxScore > 0 ? result.score / maxScore : 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit || scored.length)
}
