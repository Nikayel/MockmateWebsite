/**
 * Extraction Service
 *
 * Phase 2 of incremental service extraction.
 * Thin wrapper around conversation-extraction for service interface.
 *
 * This provides:
 * - Clean request/response interface
 * - Confidence scoring
 * - Future: caching, batching, fallback strategies
 *
 * Risk: Low | Rollback: Set USE_EXTRACTION_SERVICE flag to false
 */

import {
  extractConversationState,
  shouldRunExtraction,
  type ExtendedConversationTracker,
} from "@/lib/interview/conversation-extraction"
import type { ConversationTracker } from "@/lib/interview/interview-phases"

export interface ExtractionRequest {
  messages: Array<{ role: string; content: string }>
  currentTracker: ConversationTracker
  messageCount: number
  lastExtractionAt: number
  currentMessage: string
}

export interface ExtractionResponse {
  tracker: ExtendedConversationTracker
  confidence: number
  shouldHaveRun: boolean
  didRun: boolean
}

/**
 * Extraction service - wraps conversation extraction with service interface
 *
 * @param req - Extraction request with messages and current tracker
 * @returns Extraction response with updated tracker and confidence
 */
export async function extractionService(req: ExtractionRequest): Promise<ExtractionResponse> {
  const { messages, currentTracker, messageCount, lastExtractionAt, currentMessage } = req

  // Check if extraction should run
  const shouldRun = shouldRunExtraction(messageCount, lastExtractionAt, currentMessage)

  if (!shouldRun) {
    return {
      tracker: currentTracker as ExtendedConversationTracker,
      confidence: 1.0, // High confidence in "no change needed"
      shouldHaveRun: false,
      didRun: false,
    }
  }

  // Run extraction
  const updates = await extractConversationState(messages, currentTracker)

  // Calculate confidence based on what was extracted
  const confidence = calculateConfidence(updates)

  // Merge updates into tracker
  const mergedTracker: ExtendedConversationTracker = {
    ...currentTracker,
    ...updates,
  }

  return {
    tracker: mergedTracker,
    confidence,
    shouldHaveRun: true,
    didRun: true,
  }
}

/**
 * Calculate confidence score based on extraction results
 *
 * Higher confidence when:
 * - Multiple fields were extracted
 * - Key fields have values (not null/empty)
 * - Complexity values are normalized
 */
function calculateConfidence(updates: Partial<ExtendedConversationTracker>): number {
  if (Object.keys(updates).length === 0) {
    return 0.5 // No updates = uncertain
  }

  let score = 0.6 // Base score for having any updates

  // Boost for key fields
  if (updates.approachExplained !== undefined) score += 0.1
  if (updates.timeComplexityMentioned !== undefined) score += 0.1
  if (updates.timeComplexityValue) score += 0.05
  if (updates.dominantComplexity) score += 0.05
  if (updates.edgeCasesMentioned && updates.edgeCasesMentioned.length > 0) score += 0.05
  if (updates.approachQuality && updates.approachQuality !== "none") score += 0.05

  return Math.min(score, 1.0)
}

/**
 * Check if extraction should run (exposed for callers who need to check)
 */
export { shouldRunExtraction }
