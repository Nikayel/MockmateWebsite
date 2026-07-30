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
