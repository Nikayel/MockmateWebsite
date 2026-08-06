/**
 * Shared contracts for transcript analysis.
 *
 * The Edge and Node analyzers (transcript-analysis-edge.ts and
 * transcript-analysis.ts) exist as separate modules because the Node one pulls in
 * dependencies the Edge runtime cannot load. That split is about runtime, and
 * types have no runtime, so these were duplicated for no reason: both files
 * declared byte-identical TranscriptMessage, ProblemContext and AnalysisResult.
 *
 * Declaring them once means the two analyzers cannot silently drift on the shape
 * of their input the way the scoring pair did on its weights.
 */

import type { SilentNote } from "@/lib/interview/interview-phases"

export interface TranscriptMessage {
  role: "user" | "interviewer" | "assistant" | "candidate" | "ai_partner"
  content: string
  timestamp?: number
}

export interface ProblemContext {
  title: string
  optimalTimeComplexity: string
  optimalSpaceComplexity: string
  criticalEdgeCases: string[]
  scenarioType?: string
  /**
   * The candidate's final code.
   *
   * Optional, and everything degrades without it: the semantic prompt drops its
   * stated-vs-written complexity instruction entirely rather than asking for a
   * comparison the model has no data to make.
   *
   * This is the whole point of the field. Both analyzers already asked the model
   * for "stated O(x) but actual is O(y)" while passing only the transcript and
   * the OPTIMAL complexity, so "actual" was never observable and the check could
   * only be guessed or silently collapsed into the overclaim-vs-optimal check
   * that `buildComplexitySilentNotes` already does deterministically.
   *
   * Deliberately NOT the regex estimate in lib/interview/code-analysis.ts. That
   * heuristic reports any two-pointer solution as O(n²) and says so in its own
   * comments, so a candidate who writes a correct O(n) two-pointer scan and
   * accurately calls it O(n) would be flagged for overclaiming. Reading the code
   * is the only way to make this judgement without penalising right answers.
   */
  candidateCode?: string | null
}

export interface AnalysisResult {
  silentNotes: SilentNote[]
  analysisMetadata: {
    transcriptLength: number
    candidateMessages: number
    mistakesDetected: number
    algorithmicDetections: number
    semanticDetections: number
  }
}
