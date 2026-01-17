/**
 * LLM-based Conversation Extraction
 *
 * Uses a fast/cheap LLM call to extract what the candidate has discussed,
 * replacing fragile regex-based detection.
 */

import { generateAIResponse } from "@/lib/ai-providers"
import { logger } from "@/lib/logger"
import type { ConversationTracker } from "./interview-phases"

interface ExtractionResult {
  approachExplained: boolean
  approachType: "none" | "brute_force" | "optimized" | "unclear"
  timeComplexityMentioned: boolean
  timeComplexityValue: string | null
  spaceComplexityMentioned: boolean
  spaceComplexityValue: string | null
  complexityExplanationGiven: boolean
  edgeCasesMentioned: string[]
}

const EXTRACTION_PROMPT = `You are analyzing an interview conversation to extract what the candidate has discussed.

Given the recent messages, extract:
1. Did the candidate explain their approach? (yes/no)
2. What type of approach? (brute_force, optimized, none, unclear)
3. Did they mention time complexity? If so, what value? (e.g., "O(n)", "linear", "O(n^2)")
4. Did they mention space complexity? If so, what value?
5. Did they explain WHY the complexity is what it is? (e.g., "because we loop once", "due to the hash map")
6. What edge cases did they mention? (list them)

IMPORTANT: Be liberal in detection. If they say anything like:
- "o n" or "O n" or "O(n)" or "linear" → time complexity mentioned
- "n squared" or "O(n^2)" or "quadratic" → time complexity mentioned
- "constant space" or "O(1) space" → space complexity mentioned

Respond in JSON format only:
{
  "approachExplained": true/false,
  "approachType": "none" | "brute_force" | "optimized" | "unclear",
  "timeComplexityMentioned": true/false,
  "timeComplexityValue": "O(n)" or null,
  "spaceComplexityMentioned": true/false,
  "spaceComplexityValue": "O(1)" or null,
  "complexityExplanationGiven": true/false,
  "edgeCasesMentioned": ["empty input", "single element", ...]
}`

/**
 * Extract conversation state using LLM
 * Uses cheap/fast provider (gemini-lite) for cost efficiency
 */
export async function extractConversationState(
  recentMessages: Array<{ role: string; content: string }>,
  currentTracker: ConversationTracker
): Promise<Partial<ConversationTracker>> {
  // Skip if no messages to analyze
  if (!recentMessages || recentMessages.length === 0) {
    return {}
  }

  // Only analyze candidate messages (last 5-10 for efficiency)
  const candidateMessages = recentMessages
    .filter((m) => m.role === "user" || m.role === "candidate")
    .slice(-10)

  if (candidateMessages.length === 0) {
    return {}
  }

  // Build conversation text for analysis
  const conversationText = candidateMessages.map((m) => `CANDIDATE: ${m.content}`).join("\n\n")

  try {
    const response = await generateAIResponse(
      EXTRACTION_PROMPT,
      conversationText,
      [], // Empty history
      {
        complexity: "simple", // Uses gemini-lite (cheapest)
        temperature: 0.1, // Deterministic
        userId: "system-extraction", // For rate limiting
      }
    )

    // Parse JSON response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      logger.warn("[Extraction] Failed to parse JSON from response", {
        response: response.text.slice(0, 200),
      })
      return {}
    }

    const extracted: ExtractionResult = JSON.parse(jsonMatch[0])

    // Merge with current tracker (don't overwrite with false if already true)
    const updates: Partial<ConversationTracker> = {}

    if (extracted.approachExplained && !currentTracker.approachExplained) {
      updates.approachExplained = true
      updates.approachType = extracted.approachType
    }

    if (extracted.timeComplexityMentioned && !currentTracker.timeComplexityMentioned) {
      updates.timeComplexityMentioned = true
      updates.timeComplexityValue = extracted.timeComplexityValue
    }

    if (extracted.spaceComplexityMentioned && !currentTracker.spaceComplexityMentioned) {
      updates.spaceComplexityMentioned = true
      updates.spaceComplexityValue = extracted.spaceComplexityValue
    }

    if (extracted.complexityExplanationGiven && !currentTracker.complexityExplanationGiven) {
      updates.complexityExplanationGiven = true
    }

    // Merge edge cases (don't duplicate)
    if (extracted.edgeCasesMentioned && extracted.edgeCasesMentioned.length > 0) {
      const newEdgeCases = extracted.edgeCasesMentioned.filter(
        (ec) => !currentTracker.edgeCasesMentioned.includes(ec)
      )
      if (newEdgeCases.length > 0) {
        updates.edgeCasesMentioned = [...currentTracker.edgeCasesMentioned, ...newEdgeCases]
      }
    }

    logger.info("[Extraction] Successfully extracted conversation state", {
      extracted,
      updates,
    })

    return updates
  } catch (error) {
    logger.error("[Extraction] Failed to extract conversation state", { error })
    // Fall back to empty updates - regex will still work as backup
    return {}
  }
}

/**
 * Check if extraction should run (avoid excessive API calls)
 * Only run every N messages or when key signals detected
 */
export function shouldRunExtraction(
  messageCount: number,
  lastExtractionAt: number,
  currentMessage: string
): boolean {
  // Run extraction if:
  // 1. Every 3 candidate messages
  // 2. Key signals detected in current message
  // 3. More than 5 messages since last extraction

  const messagesSinceLastExtraction = messageCount - lastExtractionAt

  // Always run if 5+ messages since last extraction
  if (messagesSinceLastExtraction >= 5) {
    return true
  }

  // Check for key signals that warrant extraction
  const lowerMessage = currentMessage.toLowerCase()
  const keySignals = [
    "complexity",
    "o(n)",
    "o n",
    "linear",
    "constant",
    "quadratic",
    "logarithmic",
    "approach",
    "solution",
    "edge case",
    "empty",
    "null",
    "brute force",
    "optimize",
  ]

  if (keySignals.some((signal) => lowerMessage.includes(signal))) {
    return true
  }

  // Run every 3 messages minimum
  return messagesSinceLastExtraction >= 3
}
