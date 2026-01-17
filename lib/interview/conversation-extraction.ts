/**
 * LLM-based Conversation Extraction
 *
 * Uses a fast/cheap LLM call to extract what the candidate has discussed,
 * replacing fragile regex-based detection.
 *
 * Key improvements over regex:
 * - Extracts DOMINANT complexity (overall, not just first/sort)
 * - Detects approach explanation quality (not just presence)
 * - Tracks clarifying questions asked (positive signal)
 * - Understands context and intent
 */

import { generateAIResponse } from "@/lib/ai-providers"
import { logger } from "@/lib/logger"
import type { ConversationTracker } from "./interview-phases"

interface ExtractionResult {
  approachExplained: boolean
  approachType: "none" | "brute_force" | "optimized" | "unclear"
  approachQuality: "none" | "vague" | "specific" | "detailed"
  timeComplexityMentioned: boolean
  timeComplexityValue: string | null
  dominantComplexity: string | null // NEW: The overall/dominant complexity
  spaceComplexityMentioned: boolean
  spaceComplexityValue: string | null
  complexityExplanationGiven: boolean
  complexityIsAccurate: boolean | null // NEW: Is their stated complexity correct?
  edgeCasesMentioned: string[]
  clarifyingQuestionsAsked: boolean // NEW: Did they ask clarifying questions?
  answeredInterviewerQuestions: number // NEW: How many questions did they answer?
}

const EXTRACTION_PROMPT = `You are analyzing a technical interview conversation to extract what the candidate has discussed.
Your job is to accurately detect signals from the conversation - be thorough but accurate.

Given the messages, extract:

1. APPROACH EXPLANATION:
   - Did the candidate explain their approach? (yes if they described what they'll do)
   - What type? (brute_force if O(n²) or nested loops, optimized if O(n) with hash/two-pointer, unclear if can't tell)
   - Quality: "none" if no explanation, "vague" if just said "I'll use X", "specific" if described how, "detailed" if walked through logic

2. TIME COMPLEXITY:
   - Did they state time complexity? (yes if they said O(n), O(n²), linear, quadratic, etc.)
   - What value did they state? (normalize to O(n) format)
   - DOMINANT complexity: If they mentioned multiple (e.g., "sort is O(n log n), then loop is O(n²)"),
     extract the OVERALL dominant complexity (O(n²) dominates O(n log n))
   - Did they explain WHY? (yes if they said "because we loop", "due to nested", etc.)

3. SPACE COMPLEXITY:
   - Did they mention space? What value?

4. EDGE CASES:
   - List any edge cases they mentioned (empty array, null, negative numbers, duplicates, etc.)

5. POSITIVE SIGNALS:
   - Did they ask clarifying questions? (indicates good interview behavior)
   - How many interviewer questions did they answer? (count responses to direct questions)

IMPORTANT RULES:
- Be LIBERAL in detection - if they said something that implies complexity, count it
- "On2" or "o n squared" or "n squared" = O(n²)
- "On" or "o n" or "linear" = O(n)
- "two pointer" or "sort first then" = usually O(n²) or O(n log n) overall
- When multiple complexities mentioned, the DOMINANT (worst) is the overall complexity

Respond in JSON format ONLY (no markdown, no explanation):
{
  "approachExplained": true/false,
  "approachType": "none" | "brute_force" | "optimized" | "unclear",
  "approachQuality": "none" | "vague" | "specific" | "detailed",
  "timeComplexityMentioned": true/false,
  "timeComplexityValue": "O(n²)" or null,
  "dominantComplexity": "O(n²)" or null,
  "spaceComplexityMentioned": true/false,
  "spaceComplexityValue": "O(n)" or null,
  "complexityExplanationGiven": true/false,
  "complexityIsAccurate": true/false/null,
  "edgeCasesMentioned": ["empty array", "duplicates", ...],
  "clarifyingQuestionsAsked": true/false,
  "answeredInterviewerQuestions": 5
}`

// Extended tracker interface with new fields
export interface ExtendedConversationTracker extends ConversationTracker {
  approachQuality?: "none" | "vague" | "specific" | "detailed"
  dominantComplexity?: string | null
  complexityIsAccurate?: boolean | null
  clarifyingQuestionsAsked?: boolean
  answeredInterviewerQuestions?: number
}

/**
 * Extract conversation state using LLM
 * Uses cheap/fast provider for cost efficiency
 *
 * Includes BOTH candidate and interviewer messages for full context
 * (needed to count answered questions and understand conversation flow)
 */
export async function extractConversationState(
  recentMessages: Array<{ role: string; content: string }>,
  currentTracker: ConversationTracker
): Promise<Partial<ExtendedConversationTracker>> {
  // Skip if no messages to analyze
  if (!recentMessages || recentMessages.length === 0) {
    return {}
  }

  // Include both roles for full context (limit to last 15 for efficiency)
  const messages = recentMessages.slice(-15)

  if (messages.length === 0) {
    return {}
  }

  // Build conversation text with role labels
  const conversationText = messages
    .map((m) => {
      const role = m.role === "user" || m.role === "candidate" ? "CANDIDATE" : "INTERVIEWER"
      return `${role}: ${m.content}`
    })
    .join("\n\n")

  try {
    const response = await generateAIResponse(
      EXTRACTION_PROMPT,
      conversationText,
      [], // Empty history
      {
        complexity: "simple", // Uses cheap provider
        temperature: 0.1, // Deterministic
        userId: "system-extraction", // For rate limiting
      }
    )

    // Parse JSON response - handle potential markdown wrapper
    let jsonText = response.text
    // Remove markdown code block if present
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1]
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      logger.warn("[Extraction] Failed to parse JSON from response", {
        response: response.text.slice(0, 200),
      })
      return {}
    }

    const extracted: ExtractionResult = JSON.parse(jsonMatch[0])

    // Build updates - always prefer new extraction for accuracy
    const updates: Partial<ExtendedConversationTracker> = {}

    // Approach explanation
    if (extracted.approachExplained) {
      updates.approachExplained = true
      updates.approachType = extracted.approachType
      updates.approachQuality = extracted.approachQuality
    }

    // Time complexity - use DOMINANT complexity as the value
    if (extracted.timeComplexityMentioned) {
      updates.timeComplexityMentioned = true
      // Prefer dominant complexity over raw value
      updates.timeComplexityValue = extracted.dominantComplexity || extracted.timeComplexityValue
      updates.dominantComplexity = extracted.dominantComplexity
      updates.complexityIsAccurate = extracted.complexityIsAccurate
    }

    // Space complexity
    if (extracted.spaceComplexityMentioned) {
      updates.spaceComplexityMentioned = true
      updates.spaceComplexityValue = extracted.spaceComplexityValue
    }

    // Complexity explanation
    if (extracted.complexityExplanationGiven) {
      updates.complexityExplanationGiven = true
    }

    // Edge cases - merge with existing (don't duplicate)
    if (extracted.edgeCasesMentioned && extracted.edgeCasesMentioned.length > 0) {
      const existingEdgeCases = currentTracker.edgeCasesMentioned || []
      const allEdgeCases = new Set([...existingEdgeCases, ...extracted.edgeCasesMentioned])
      updates.edgeCasesMentioned = Array.from(allEdgeCases)
    }

    // New positive signals
    if (extracted.clarifyingQuestionsAsked) {
      updates.clarifyingQuestionsAsked = true
    }
    if (extracted.answeredInterviewerQuestions !== undefined) {
      updates.answeredInterviewerQuestions = extracted.answeredInterviewerQuestions
    }

    logger.info("[Extraction] Successfully extracted conversation state", {
      approachExplained: extracted.approachExplained,
      approachQuality: extracted.approachQuality,
      timeComplexity: extracted.dominantComplexity || extracted.timeComplexityValue,
      edgeCases: extracted.edgeCasesMentioned?.length || 0,
      clarifyingQuestions: extracted.clarifyingQuestionsAsked,
      questionsAnswered: extracted.answeredInterviewerQuestions,
    })

    return updates
  } catch (error) {
    logger.error("[Extraction] Failed to extract conversation state", { error })
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
