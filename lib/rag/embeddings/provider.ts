/**
 * Embedding Provider
 * 
 * Current implementation: TF-IDF style bag-of-words with domain-specific weighting
 * Future: Can be upgraded to use OpenAI embeddings, sentence-transformers, etc.
 */

// Embedding dimensions
const TEXT_EMBEDDING_DIM = 256

// Domain-specific vocabulary for coding problems and system design
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
  // System design concepts
  systemDesign: ['system design', 'architecture', 'scalability', 'distributed system', 'microservices', 'load balancer', 'database', 'cache', 'message queue', 'api', 'endpoint', 'latency', 'throughput', 'availability', 'consistency', 'replication', 'sharding', 'partitioning', 'cdn', 'websocket', 'pub sub', 'event driven', 'monolith', 'service', 'component', 'data model', 'schema', 'index', 'query', 'storage', 'reliability', 'fault tolerance', 'monitoring', 'observability', 'security', 'authentication', 'authorization', 'rate limiting', 'circuit breaker', 'retry', 'backoff', 'idempotency'],
}

// Flatten vocabulary for quick lookup
const ALL_KEYWORDS = Object.values(CODING_VOCABULARY).flat()

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
    // System design features
    isSystemDesign: tokens.some(t => t.includes('system') || t.includes('design') || t.includes('architecture') || t.includes('scalability')),
    hasScalability: tokens.some(t => t.includes('scale') || t.includes('scalability') || t.includes('throughput') || t.includes('load')),
    hasDistributed: tokens.some(t => t.includes('distributed') || t.includes('microservice') || t.includes('service')),
    hasDatabase: tokens.some(t => t.includes('database') || t.includes('db') || t.includes('sql') || t.includes('nosql') || t.includes('storage')),
    hasCache: tokens.some(t => t.includes('cache') || t.includes('redis') || t.includes('memcached')),
    hasQueue: tokens.some(t => t.includes('queue') || t.includes('kafka') || t.includes('rabbitmq') || t.includes('message')),
    hasAPI: tokens.some(t => t.includes('api') || t.includes('endpoint') || t.includes('rest') || t.includes('graphql')),
    hasLatency: tokens.some(t => t.includes('latency') || t.includes('response time') || t.includes('performance')),
    hasAvailability: tokens.some(t => t.includes('availability') || t.includes('uptime') || t.includes('reliability') || t.includes('fault')),
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
 * TF-IDF Embedding Provider
 */
export class TFIDFEmbeddingProvider {
  async generateEmbedding(text: string): Promise<number[]> {
    return generateTextEmbedding(text)
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return texts.map(text => generateTextEmbedding(text))
  }
}

