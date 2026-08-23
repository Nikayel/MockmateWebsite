import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type {
  GeneratedHint,
  HintGenerationResponse,
  HintLevel,
  HintTrigger,
  StruggleMetrics,
} from "./types"

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
  /** Interview session doc id, so hint LLM spend bills to the session. Hints
   * were the largest per-user cost with NO session attribution at all. */
  sessionId?: string
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
  /**
   * Ids the caller has already revealed.
   *
   * Retained for older clients, but it CANNOT drive escalation on its own and
   * must not be used that way again. Every call regenerates hints tailored to
   * the candidate's current code, and `generateHintId()` mints a fresh
   * `hint_${Date.now()}_${random}` each time, so ids from an earlier batch
   * never appear in a later one. Matching on them always succeeded, always
   * selected element [0], and element [0] is the lowest level because
   * finalizeHints sorts ascending - so the ladder returned level 1 forever.
   */
  previousHintIds: string[]
  /**
   * Highest hint level the caller has already revealed, or omitted if none.
   *
   * This is what actually drives escalation. Level survives regeneration
   * because it is semantic; an id does not.
   */
  highestRevealedLevel?: HintLevel
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
