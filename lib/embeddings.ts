/**
 * Text Embedding Service for RAG Features
 *
 * This module provides text embedding capabilities for:
 * - Problem statements
 * - User solutions
 * - Hints and recommendations
 *
 * Current Implementation: TF-IDF style bag-of-words with domain-specific weighting
 * Future: Can be upgraded to use OpenAI embeddings, sentence-transformers, etc.
 */

import { db } from "./firebase"
import { collection, addDoc, getDocs, query, where, orderBy, limit, doc, getDoc, setDoc } from "firebase/firestore"
import { cosineSimilarity } from "./vectorization"

// Embedding dimensions
const TEXT_EMBEDDING_DIM = 256

// Domain-specific vocabulary for coding problems
const CODING_VOCABULARY = {
  // Data structures
  dataStructures: ['array', 'list', 'linked list', 'stack', 'queue', 'tree', 'binary tree', 'graph', 'hash', 'map', 'set', 'heap', 'trie', 'matrix'],
  // Algorithms
  algorithms: ['sort', 'search', 'binary search', 'dfs', 'bfs', 'dynamic programming', 'recursion', 'backtracking', 'greedy', 'divide and conquer', 'two pointer', 'sliding window'],
  // Complexity
  complexity: ['time complexity', 'space complexity', 'O(n)', 'O(1)', 'O(n^2)', 'O(log n)', 'O(n log n)', 'optimal', 'efficient'],
  // Problem types
  problemTypes: ['string', 'number', 'integer', 'sum', 'product', 'maximum', 'minimum', 'palindrome', 'substring', 'subarray', 'permutation', 'combination'],
  // Operations
  operations: ['insert', 'delete', 'update', 'find', 'traverse', 'reverse', 'merge', 'split', 'rotate', 'swap'],
}

// Flatten vocabulary for quick lookup
const ALL_KEYWORDS = Object.values(CODING_VOCABULARY).flat()

export interface TextEmbedding {
  id?: string
  text: string
  type: 'problem' | 'solution' | 'hint' | 'feedback'
  vector: number[]
  metadata: {
    problemId?: string
    userId?: string
    difficulty?: string
    tags?: string[]
    timestamp: string
  }
}

export interface SimilarResult {
  id: string
  text: string
  type: string
  similarity: number
  metadata: any
}

/**
 * Tokenize text into words and n-grams
 */
function tokenize(text: string): string[] {
  const normalized = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const words = normalized.split(' ').filter(w => w.length > 1)

  // Also extract bigrams for phrases like "binary search", "linked list"
  const bigrams: string[] = []
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`)
  }

  return [...words, ...bigrams]
}

/**
 * Calculate term frequency for a document
 */
function calculateTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  const total = tokens.length

  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1)
  }

  // Normalize by total tokens
  for (const [key, value] of tf) {
    tf.set(key, value / total)
  }

  return tf
}

/**
 * Generate a lightweight text embedding
 * Uses a combination of:
 * 1. Domain-specific keyword matching
 * 2. Character n-gram hashing (for handling variations)
 * 3. Semantic category detection
 */
export function generateTextEmbedding(text: string): number[] {
  const tokens = tokenize(text)
  const tf = calculateTF(tokens)
  const vector = new Array(TEXT_EMBEDDING_DIM).fill(0)

  // Section 1: Domain-specific keyword features (0-63)
  let idx = 0
  for (const category of Object.values(CODING_VOCABULARY)) {
    for (const keyword of category) {
      if (idx < 64) {
        const keywordTokens = keyword.toLowerCase().split(' ')
        let found = false
        for (const kt of keywordTokens) {
          if (tokens.some(t => t.includes(kt) || kt.includes(t))) {
            found = true
            break
          }
        }
        vector[idx] = found ? (tf.get(keyword) || 0.1) : 0
        idx++
      }
    }
  }

  // Section 2: Character n-gram hashing (64-191) for fuzzy matching
  for (const token of tokens) {
    // Generate character trigrams
    for (let i = 0; i < token.length - 2; i++) {
      const trigram = token.substring(i, i + 3)
      // Hash to bucket
      const hash = hashString(trigram) % 128
      vector[64 + hash] += 0.1
    }
  }

  // Section 3: Semantic categories (192-223)
  const semanticFeatures = {
    hasArray: tokens.some(t => t.includes('array') || t.includes('list')),
    hasTree: tokens.some(t => t.includes('tree') || t.includes('node') || t.includes('binary')),
    hasGraph: tokens.some(t => t.includes('graph') || t.includes('edge') || t.includes('vertex')),
    hasHash: tokens.some(t => t.includes('hash') || t.includes('map') || t.includes('dict')),
    hasSort: tokens.some(t => t.includes('sort') || t.includes('order')),
    hasSearch: tokens.some(t => t.includes('search') || t.includes('find') || t.includes('lookup')),
    hasDP: tokens.some(t => t.includes('dynamic') || t.includes('memo') || t.includes('optimal')),
    hasRecursion: tokens.some(t => t.includes('recursion') || t.includes('recursive')),
    hasString: tokens.some(t => t.includes('string') || t.includes('substring') || t.includes('char')),
    hasNumber: tokens.some(t => t.includes('number') || t.includes('integer') || t.includes('digit')),
    hasPalindrome: tokens.some(t => t.includes('palindrome') || t.includes('reverse')),
    hasTwoPointer: tokens.some(t => t.includes('pointer') || t.includes('window')),
    isEasy: text.toLowerCase().includes('easy') || text.toLowerCase().includes('simple'),
    isMedium: text.toLowerCase().includes('medium') || text.toLowerCase().includes('moderate'),
    isHard: text.toLowerCase().includes('hard') || text.toLowerCase().includes('difficult'),
    hasTimeComplexity: text.toLowerCase().includes('time complexity') || text.toLowerCase().includes('o('),
    hasSpaceComplexity: text.toLowerCase().includes('space complexity') || text.toLowerCase().includes('memory'),
    hasEdgeCase: text.toLowerCase().includes('edge case') || text.toLowerCase().includes('corner case'),
    hasDuplicate: text.toLowerCase().includes('duplicate') || text.toLowerCase().includes('unique'),
    hasSum: text.toLowerCase().includes('sum') || text.toLowerCase().includes('total'),
    hasMax: text.toLowerCase().includes('maximum') || text.toLowerCase().includes('largest'),
    hasMin: text.toLowerCase().includes('minimum') || text.toLowerCase().includes('smallest'),
    hasPath: text.toLowerCase().includes('path') || text.toLowerCase().includes('route'),
    hasMatrix: text.toLowerCase().includes('matrix') || text.toLowerCase().includes('grid'),
  }

  const semanticValues = Object.values(semanticFeatures)
  for (let i = 0; i < semanticValues.length && i < 32; i++) {
    vector[192 + i] = semanticValues[i] ? 1 : 0
  }

  // Section 4: Text statistics (224-255)
  vector[224] = Math.min(1, tokens.length / 100) // Normalized token count
  vector[225] = Math.min(1, text.length / 1000) // Normalized text length
  vector[226] = tokens.filter(t => t.length > 6).length / Math.max(1, tokens.length) // Long word ratio
  vector[227] = text.split('.').length / Math.max(1, text.length / 100) // Sentence density
  vector[228] = (text.match(/\?/g) || []).length / 10 // Question marks (normalized)
  vector[229] = tokens.filter(t => ALL_KEYWORDS.includes(t)).length / Math.max(1, tokens.length) // Keyword density

  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude
    }
  }

  return vector
}

/**
 * Simple string hash function
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Store a text embedding in Firestore
 */
export async function storeTextEmbedding(embedding: TextEmbedding): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'text_embeddings'), {
      ...embedding,
      metadata: {
        ...embedding.metadata,
        timestamp: embedding.metadata.timestamp || new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error storing text embedding:', error)
    throw error
  }
}

/**
 * Find similar texts based on embedding similarity
 */
export async function findSimilarTexts(
  queryVector: number[],
  options: {
    type?: 'problem' | 'solution' | 'hint' | 'feedback'
    limit?: number
    minSimilarity?: number
    excludeIds?: string[]
    userId?: string
  } = {}
): Promise<SimilarResult[]> {
  try {
    const { type, limit: maxResults = 5, minSimilarity = 0.3, excludeIds = [], userId } = options

    // Build query
    let q = query(
      collection(db, 'text_embeddings'),
      orderBy('metadata.timestamp', 'desc'),
      limit(200) // Fetch more to filter client-side
    )

    const snapshot = await getDocs(q)
    const results: SimilarResult[] = []

    snapshot.forEach(doc => {
      const data = doc.data()

      // Apply filters
      if (type && data.type !== type) return
      if (excludeIds.includes(doc.id)) return
      if (userId && data.metadata?.userId !== userId) return

      // Calculate similarity
      const similarity = cosineSimilarity(queryVector, data.vector)

      if (similarity >= minSimilarity) {
        results.push({
          id: doc.id,
          text: data.text,
          type: data.type,
          similarity,
          metadata: data.metadata,
        })
      }
    })

    // Sort by similarity and limit
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults)
  } catch (error) {
    console.error('Error finding similar texts:', error)
    return []
  }
}

/**
 * Get similar problems based on a problem statement
 */
export async function getSimilarProblems(
  problemText: string,
  options: {
    limit?: number
    excludeProblemId?: string
    difficulty?: string
  } = {}
): Promise<SimilarResult[]> {
  const queryVector = generateTextEmbedding(problemText)

  return findSimilarTexts(queryVector, {
    type: 'problem',
    limit: options.limit || 5,
    excludeIds: options.excludeProblemId ? [options.excludeProblemId] : [],
    minSimilarity: 0.4,
  })
}

/**
 * Get relevant hints based on the current problem and user's code
 */
export async function getRelevantHints(
  problemText: string,
  userCode: string,
  options: {
    limit?: number
  } = {}
): Promise<SimilarResult[]> {
  // Combine problem and code context for better hint matching
  const combinedText = `${problemText}\n\nUser's current approach:\n${userCode}`
  const queryVector = generateTextEmbedding(combinedText)

  return findSimilarTexts(queryVector, {
    type: 'hint',
    limit: options.limit || 3,
    minSimilarity: 0.35,
  })
}

/**
 * Get past solutions similar to current problem
 */
export async function getSimilarSolutions(
  problemText: string,
  userId: string,
  options: {
    limit?: number
  } = {}
): Promise<SimilarResult[]> {
  const queryVector = generateTextEmbedding(problemText)

  return findSimilarTexts(queryVector, {
    type: 'solution',
    limit: options.limit || 5,
    userId,
    minSimilarity: 0.4,
  })
}

/**
 * Store problem embedding for future retrieval
 */
export async function embedAndStoreProblem(
  problemId: string,
  problemText: string,
  metadata: {
    title: string
    difficulty: string
    type: string
    tags: string[]
  }
): Promise<string> {
  const vector = generateTextEmbedding(problemText)

  const embedding: TextEmbedding = {
    text: problemText,
    type: 'problem',
    vector,
    metadata: {
      problemId,
      difficulty: metadata.difficulty,
      tags: metadata.tags,
      timestamp: new Date().toISOString(),
    },
  }

  return storeTextEmbedding(embedding)
}

/**
 * Store solution embedding for user's history
 */
export async function embedAndStoreSolution(
  userId: string,
  problemId: string,
  solutionCode: string,
  metadata: {
    problemTitle: string
    language: string
    passed: boolean
    score: number
  }
): Promise<string> {
  // Include both the code and some context about the problem
  const textToEmbed = `Solution for ${metadata.problemTitle} in ${metadata.language}:\n${solutionCode}`
  const vector = generateTextEmbedding(textToEmbed)

  const embedding: TextEmbedding = {
    text: solutionCode,
    type: 'solution',
    vector,
    metadata: {
      problemId,
      userId,
      tags: [metadata.language, metadata.passed ? 'passed' : 'failed'],
      timestamp: new Date().toISOString(),
    },
  }

  return storeTextEmbedding(embedding)
}

/**
 * Store a hint for future retrieval
 */
export async function embedAndStoreHint(
  problemId: string,
  hintText: string,
  hintLevel: number, // 1 = gentle nudge, 2 = medium hint, 3 = strong hint
  metadata: {
    problemTitle: string
    problemType: string
    tags: string[]
  }
): Promise<string> {
  const vector = generateTextEmbedding(hintText)

  const embedding: TextEmbedding = {
    text: hintText,
    type: 'hint',
    vector,
    metadata: {
      problemId,
      tags: [...metadata.tags, `level-${hintLevel}`],
      timestamp: new Date().toISOString(),
    },
  }

  return storeTextEmbedding(embedding)
}

/**
 * Get recommended next problems based on what user just solved
 */
export async function getRecommendedNextProblems(
  userId: string,
  currentProblemText: string,
  currentProblemId?: string
): Promise<SimilarResult[]> {
  const similarProblems = await getSimilarProblems(currentProblemText, {
    limit: 10,
    excludeProblemId: currentProblemId,
  })

  const unsolvedProblems: SimilarResult[] = []

  for (const problem of similarProblems) {
    const problemId = problem.metadata?.problemId
    if (!problemId) continue

    const userSolutions = await findSimilarTexts(
      generateTextEmbedding(problem.text),
      {
        type: 'solution',
        userId,
        limit: 1,
        minSimilarity: 0.3,
      }
    )

    if (userSolutions.length === 0) {
      unsolvedProblems.push(problem)
    }
  }

  return unsolvedProblems.slice(0, 3)
}
