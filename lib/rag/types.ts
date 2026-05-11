/**
 * Shared types for RAG operations
 */

export interface TextEmbedding {
  id?: string
  text: string
  type: "problem" | "solution" | "hint" | "feedback" | "onboarding" | "knowledge"
  vector: number[]
  metadata: {
    problemId?: string
    userId?: string
    user_id?: string // For Firestore rules compatibility
    difficulty?: string
    tags?: string[]
    timestamp: string
    role?: string
    goal?: string
    problemTitle?: string
    hintLevel?: 1 | 2 | 3 | 4
    category?: "approach" | "conceptual" | "implementation" | "optimization" | "debugging"
    pattern?: string
    problemType?: string
  }
}

export interface SimilarResult {
  id: string
  text: string
  type: string
  similarity: number
  metadata: any
}

export interface SessionMetrics {
  // Time metrics
  timeSpentSeconds: number
  timeToFirstCode: number
  timeBetweenMessages: number[]

  // Collaboration metrics
  interviewerMessagesSent: number
  interviewerMessagesReceived: number
  partnerMessagesSent: number
  partnerMessagesReceived: number
  hintsRevealed: number
  hintsTotal: number

  // Test metrics
  testsPassed: number
  testsTotal: number
  testsRunCount: number

  // Code metrics
  linesOfCode: number
  codeChangesCount: number
  finalCodeLength: number

  // Efficiency metrics
  codeEfficiencyScore: number
  timeComplexityScore: number
  spaceComplexityScore: number

  // Problem context
  problemDifficulty: "easy" | "medium" | "hard"
  problemType: "dsa" | "bugfix" | "system-design"

  // Final scores
  correctnessScore: number
  overallScore: number
}

export interface SessionVector {
  userId: string
  sessionId: string
  scenarioId: string
  scenarioTitle: string
  timestamp: Date
  vector: number[]
  scores: {
    correctness: number
    efficiency: number
    codeQuality: number
    reasoning: number
    collaboration: number
    overall: number
  }
  metadata: {
    difficulty: string
    type: string
    language: string
    duration: number
  }
}

export interface CodeFeatures {
  // Structural features
  functionCount: number
  classCount: number
  loopCount: number
  conditionalCount: number
  recursionDetected: boolean

  // Quality features
  hasComments: boolean
  hasErrorHandling: boolean
  hasInputValidation: boolean
  averageLineLength: number
  maxNestingDepth: number

  // Pattern features
  usesHashMap: boolean
  usesSorting: boolean
  usesRecursion: boolean
  usesDynamicProgramming: boolean
  usesGreedy: boolean
}

export interface UserPerformanceProfile {
  userId: string
  totalSessions: number
  averageScore: number
  scoresByType: Record<string, number[]>
  scoresByDifficulty: Record<string, number[]>
  strengthAreas: string[]
  weaknessAreas: string[]
  recentTrend: "improving" | "stable" | "declining"
  vectorizedProfile: number[]
  lastUpdated: Date
}

// Embedding types
export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>
  generateEmbeddings(texts: string[]): Promise<number[][]>
}

export interface Chunk {
  text: string
  startIndex: number
  endIndex: number
  metadata?: Record<string, any>
}

export interface Chunker {
  chunk(text: string, options?: ChunkOptions): Chunk[]
}

export interface ChunkOptions {
  maxChunkSize?: number
  overlap?: number
  strategy?: "sentence" | "paragraph" | "token"
}

// Vector DB types
export interface VectorDocument {
  id: string
  vector: number[]
  metadata: Record<string, any>
  text?: string
}

export interface VectorDB {
  upsert(documents: VectorDocument[]): Promise<void>
  query(vector: number[], options: QueryOptions): Promise<QueryResult[]>
  delete(ids: string[]): Promise<void>
  healthCheck(): Promise<boolean>
  getStats?(): Promise<{ totalVectors: number; namespaces: Record<string, number> }>
}

export interface QueryOptions {
  topK?: number
  filter?: {
    type?: "problem" | "solution" | "hint" | "feedback" | "onboarding" | "knowledge"
    userId?: string
    problemType?: string
    excludeIds?: string[]
    minSimilarity?: number
  }
  includeMetadata?: boolean
  includeValues?: boolean
}

export interface QueryResult {
  id: string
  score: number
  metadata?: Record<string, any>
  vector?: number[]
}

// Retrieval types
export interface SimilaritySearchOptions {
  limit?: number
  minSimilarity?: number
  excludeIds?: string[]
  userId?: string
  problemType?: string
  type?: "problem" | "solution" | "hint" | "feedback" | "onboarding" | "knowledge"
}

export interface RerankerOptions {
  topK?: number
  query?: string
}
