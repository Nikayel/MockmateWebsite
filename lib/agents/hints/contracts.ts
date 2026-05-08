import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { GeneratedHint, HintGenerationResponse, HintTrigger, StruggleMetrics } from "./types"

export type HintAction = "generate" | "get-next"

export interface HintTestResults {
  passed: number
  total: number
  failingTests?: string[]
}

export interface HintComplexityTarget {
  time: string
  space: string
}

export interface BaseHintRequestPayload {
  userId: string
  problemId: string
  problemTitle: string
  problemText: string
  problemPattern?: DSAPattern
  difficulty?: "easy" | "medium" | "hard"
  userCode?: string
  language?: string
  struggleMetrics?: Partial<StruggleMetrics>
  testResults?: HintTestResults
  optimalComplexity?: HintComplexityTarget
  constraints?: string[]
}

export interface GenerateHintsPayload extends BaseHintRequestPayload {
  action: "generate"
  existingHints?: string[]
  trigger?: HintTrigger
}

export interface GetNextHintPayload extends BaseHintRequestPayload {
  action: "get-next"
  previousHintIds: string[]
}

export type HintApiRequestBody = GenerateHintsPayload | GetNextHintPayload

export interface GenerateHintsApiResponse extends HintGenerationResponse {
  ragHintsCount: number
}

export interface GetNextHintApiResponse {
  hint: GeneratedHint | null
  message: string
  source?: GeneratedHint["source"] | "rag"
}
