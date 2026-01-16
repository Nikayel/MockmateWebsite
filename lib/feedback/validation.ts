/**
 * Code validation and AI overlap detection
 *
 * This module provides functions to analyze code similarity and detect
 * if candidates have blindly copied AI Partner suggestions without understanding.
 */

import type { AICodeOverlapResult, ConversationValidation } from "./types"
import { generateAIResponse } from "@/lib/ai-providers"
import { logger } from "@/lib/logger"

// ============================================================================
// CODE EXTRACTION AND SIMILARITY
// ============================================================================

/**
 * Extract code blocks from AI Partner conversation
 */
export function extractCodeFromPartnerMessages(
  messages: Array<{ role: string; content: string }> | undefined
): string[] {
  if (!messages || !Array.isArray(messages)) return []

  const codeBlocks: string[] = []
  const codeBlockRegex = /```[\w]*\n?([\s\S]*?)```/g

  for (const msg of messages) {
    // Only look at AI Partner (model) responses
    if (msg.role !== "model" && msg.role !== "assistant") continue

    let match
    while ((match = codeBlockRegex.exec(msg.content)) !== null) {
      const code = match[1].trim()
      if (code.length > 20) {
        // Ignore tiny snippets
        codeBlocks.push(code)
      }
    }
  }

  return codeBlocks
}

/**
 * Normalize code for comparison (remove whitespace, comments, variable names don't matter)
 */
export function normalizeCode(code: string): string {
  return code
    .replace(/\/\/.*$/gm, "") // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
    .replace(/#.*$/gm, "") // Remove Python comments
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/["'`]/g, '"') // Normalize quotes
    .toLowerCase()
    .trim()
}

/**
 * Calculate similarity between two code strings using longest common subsequence
 */
export function calculateCodeSimilarity(code1: string, code2: string): number {
  const s1 = normalizeCode(code1)
  const s2 = normalizeCode(code2)

  if (s1.length === 0 || s2.length === 0) return 0

  // Use a simple character-level LCS ratio for efficiency
  // For longer strings, we use n-gram comparison
  if (s1.length > 500 || s2.length > 500) {
    // Use 4-gram comparison for longer code
    const ngrams1 = new Set<string>()
    const ngrams2 = new Set<string>()

    for (let i = 0; i <= s1.length - 4; i++) {
      ngrams1.add(s1.substring(i, i + 4))
    }
    for (let i = 0; i <= s2.length - 4; i++) {
      ngrams2.add(s2.substring(i, i + 4))
    }

    let matches = 0
    for (const ng of ngrams1) {
      if (ngrams2.has(ng)) matches++
    }

    const maxSize = Math.max(ngrams1.size, ngrams2.size)
    return maxSize > 0 ? (matches / maxSize) * 100 : 0
  }

  // For shorter code, use exact substring matching
  const minLen = Math.min(s1.length, s2.length)
  let matchingChars = 0

  // Sliding window to find longest matching substring
  for (let windowSize = Math.floor(minLen * 0.8); windowSize >= 10; windowSize -= 5) {
    for (let i = 0; i <= s1.length - windowSize; i++) {
      const substr = s1.substring(i, i + windowSize)
      if (s2.includes(substr)) {
        matchingChars = Math.max(matchingChars, windowSize)
        break
      }
    }
    if (matchingChars > 0) break
  }

  return (matchingChars / minLen) * 100
}

/**
 * Analyze if candidate code heavily copies AI Partner suggestions
 */
export function analyzeAICodeOverlap(
  finalCode: string,
  partnerMessages: Array<{ role: string; content: string }> | undefined
): AICodeOverlapResult {
  if (!finalCode || !partnerMessages || partnerMessages.length === 0) {
    return {
      hasHighOverlap: false,
      overlapPercentage: 0,
      copiedSnippets: [],
      modificationsMade: true,
    }
  }

  const aiCodeBlocks = extractCodeFromPartnerMessages(partnerMessages)
  if (aiCodeBlocks.length === 0) {
    return {
      hasHighOverlap: false,
      overlapPercentage: 0,
      copiedSnippets: [],
      modificationsMade: true,
    }
  }

  // Calculate similarity with each AI code block
  let maxOverlap = 0
  const copiedSnippets: string[] = []

  for (const aiCode of aiCodeBlocks) {
    const similarity = calculateCodeSimilarity(finalCode, aiCode)
    if (similarity > maxOverlap) {
      maxOverlap = similarity
    }
    if (similarity >= 70) {
      copiedSnippets.push(aiCode.substring(0, 100) + (aiCode.length > 100 ? "..." : ""))
    }
  }

  // Check if any modifications were made (compare normalized lengths)
  const normalizedFinal = normalizeCode(finalCode)
  const allAINormalized = aiCodeBlocks.map(normalizeCode).join(" ")
  const modificationsMade =
    normalizedFinal.length !== allAINormalized.length || normalizedFinal !== allAINormalized

  return {
    hasHighOverlap: maxOverlap >= 70,
    overlapPercentage: Math.round(maxOverlap),
    copiedSnippets,
    modificationsMade,
  }
}

// ============================================================================
// AI CONVERSATION VALIDATION
// ============================================================================

/**
 * STEP 2: AI validation of conversation quality
 * Only called if pre-screening passes basic checks
 * Returns structured validation that algorithm uses for scoring
 */
export async function validateConversationWithAI(
  transcript: Array<{ role: string; content: string }>,
  code: string,
  actualComplexity: { time: string; space: string } | null
): Promise<ConversationValidation> {
  // IMPORTANT: Include BOTH early messages (approach explanation) and late messages (complexity)
  // Taking only the last 15 would miss the approach explanation at the start!
  let messagesToAnalyze: Array<{ role: string; content: string }> = []

  if (transcript.length <= 40) {
    // Short-medium conversation - use all messages to avoid losing edge case discussions
    messagesToAnalyze = transcript
  } else {
    // Very long conversation - take first 15 (approach) + last 20 (complexity/wrap-up)
    const firstMessages = transcript.slice(0, 15)
    const lastMessages = transcript.slice(-20)
    messagesToAnalyze = [
      ...firstMessages,
      { role: "system", content: "[... middle of conversation ...]" },
      ...lastMessages,
    ]
  }

  const conversationText = messagesToAnalyze
    .map(
      (m) =>
        `[${m.role.toUpperCase()}]: ${m.content.slice(0, 300)}${m.content.length > 300 ? "..." : ""}`
    )
    .join("\n")

  // Count interviewer questions
  const interviewerQuestions = transcript.filter(
    (m) => m.role === "interviewer" && m.content.includes("?")
  ).length

  const validationPrompt = `Analyze this coding interview conversation and return ONLY valid JSON.

CONVERSATION:
${conversationText}

CANDIDATE'S CODE (for complexity verification):
\`\`\`
${code.slice(0, 1000)}
\`\`\`

ACTUAL CODE COMPLEXITY: Time=${actualComplexity?.time || "unknown"}, Space=${actualComplexity?.space || "unknown"}

Analyze and return this exact JSON structure (no markdown, no explanation):
{
  "isCoherent": true/false,
  "responsesRelevant": true/false,
  "approachExplained": true/false,
  "approachQuality": "none|poor|basic|good|excellent",
  "complexityDiscussed": true/false,
  "complexityAccurate": true/false,
  "statedComplexity": "O(n)" or null,
  "questionsAsked": ${interviewerQuestions},
  "questionsAnswered": number,
  "edgeCasesConsidered": true/false,
  "alternativesDiscussed": true/false,
  "communicationScore": 0-100
}

VALIDATION RULES:
- isCoherent: false if responses are gibberish, random words, or nonsensical
- responsesRelevant: false if candidate responses don't relate to questions asked

- approachExplained: true if they described HOW they will solve the problem in ANY natural way.
  EXAMPLES OF APPROACH EXPLAINED (mark as TRUE):
  * "I'm thinking I can multiply each item by its left and then by its right" ✓
  * "I'll use two pointers starting from both ends" ✓
  * "First I'll build a prefix array, then iterate backwards" ✓
  * "So if we start from the left, there's nothing, so I'd say it's one..." (tracing through logic) ✓
  * "I want to loop over and keep track of the running product" ✓
  * Walking through an example step-by-step to show their thinking ✓
  * Discussing brute force first, then explaining optimized approach ✓
  * "The core idea is..." or "Pretty much what's happening is..." ✓
  * Explaining trade-offs like "fresh start or extend the window" ✓
  * Describing algorithm in conversational terms (even if not formal vocabulary) ✓

  EXAMPLES OF NO APPROACH (mark as FALSE):
  * Just typing code without saying anything ✗
  * "Let me try" then immediately coding ✗
  * Only asking clarifying questions but never explaining strategy ✗
  * ONLY submitting code with zero verbal explanation ✗

- approachQuality (only if approachExplained is true):
  * "poor" - Single vague sentence like "I'll loop through" with no detail
  * "basic" - Mentioned the general idea but minimal reasoning
  * "good" - Explained approach clearly, walked through examples or logic
  * "excellent" - Detailed explanation with trade-offs, alternatives, or optimizations discussed

- complexityDiscussed: true if they mentioned time/space complexity (e.g., "O(n)", "linear", "constant space")
- complexityAccurate: true ONLY if stated complexity matches actual code complexity
- edgeCasesConsidered: true if ANY of these occurred:
  * User proactively mentioned potential edge cases or boundary conditions
  * User discussed what happens in special scenarios (empty input, single element, different lengths, etc.)
  * User responded thoughtfully to interviewer's edge case questions (this COUNTS as discussing edge cases)
  * User's approach explanation included handling special cases
  Examples that COUNT as edge case discussion (mark as TRUE):
  * "What if the strings are different lengths?" ✓
  * "For empty arrays, we'd return..." ✓
  * "The constraint says lowercase only, so we don't need to handle Unicode" ✓
  * Responding to interviewer's "What about Unicode?" with a thoughtful answer ✓
  * "If there's nothing in the array..." ✓
  * "For the base case when it's empty..." ✓
  Examples that do NOT count (mark as FALSE):
  * Only coding without any discussion ✗
  * Ignoring or deflecting interviewer's edge case questions ✗
  * Single word answers to edge case questions ✗
- alternativesDiscussed: true if they mentioned other approaches or trade-offs

- communicationScore: Evaluate the OVERALL quality of communication:
  * 0-20: No communication - typed code silently
  * 20-40: Minimal - brief answers, no real explanation
  * 40-60: Basic - some explanation but incomplete engagement
  * 60-80: Good - explained approach, engaged with interviewer, discussed complexity
  * 80-100: Excellent - proactive, thorough explanations, edge cases, trade-offs

  IMPORTANT: If the candidate walked through their thinking step-by-step (even conversationally),
  traced through examples, AND discussed complexity - that's 60-80 range minimum.
  Don't penalize natural/conversational communication style.

CRITICAL: Silent coding (no explanation at all) = communication score < 40.
But conversational explanations count! "I'm thinking..." or tracing through examples IS explaining.

VOICE TRANSCRIPTION NOTE: The conversation may be from voice input with transcription artifacts:
- Misspellings are common (e.g., "four loop" = "for loop", "cadence" = "Kadane's")
- Sentences may run together or have odd punctuation
- Technical terms may be phonetically spelled
- Do NOT penalize for transcription quality - focus on the IDEAS being communicated

Return ONLY the JSON object, nothing else.`

  try {
    const response = await generateAIResponse(
      "You are a technical interview evaluator. Return only valid JSON, no markdown.",
      validationPrompt,
      [],
      { complexity: "standard", temperature: 0.1 } // Use better model for accurate conversation analysis
    )

    // Parse AI response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])

      // Calculate engagement metrics from transcript for sanity checks
      const candidateMessages = transcript.filter((m) => m.role === "candidate")
      const totalCandidateChars = candidateMessages.reduce((sum, m) => sum + m.content.length, 0)
      const avgMessageLength = totalCandidateChars / Math.max(1, candidateMessages.length)

      // Voice transcription creates many short messages, so use TOTAL content as additional signal
      // 400 chars total = ~80 words = reasonable explanation
      const hasTotalContentEngagement = totalCandidateChars >= 400 && candidateMessages.length >= 3
      const hasSubstantialEngagement =
        (candidateMessages.length >= 5 && avgMessageLength >= 80) || hasTotalContentEngagement

      // Check if interviewer praised communication (strong signal that AI validation is wrong)
      const interviewerMessages = transcript.filter((m) => m.role === "interviewer")
      const interviewerPraisedCommunication = interviewerMessages.some((m) =>
        // Patterns for positive communication feedback:
        // - "communication was clear/direct/good"
        // - "communicated clearly/well"
        // - "explained clearly/well"
        // - "clear explanation"
        // - "good work/job", "solid performance", "nice work"
        // - "you have a good grasp"
        // - "I'm satisfied"
        /communication\s+(was|is)\s+(clear|direct|good|excellent)|communicated?\s+(clearly|well|good)|explained?\s+(clearly|well)|clear\s+explanation|good\s+(work|job)|solid\s+performance|nice\s+work|have\s+a\s+good\s+grasp|I'm\s+satisfied/i.test(
          m.content
        )
      )

      // SAFETY NET: If AI says approachExplained=false but there's strong engagement,
      // check if they discussed complexity (which implies they explained their thinking)
      let approachExplained = Boolean(parsed.approachExplained)
      let approachQuality = parsed.approachQuality || "none"
      let communicationScore = Math.min(100, Math.max(0, Number(parsed.communicationScore) || 50))
      const edgeCasesConsidered = Boolean(parsed.edgeCasesConsidered)

      // Override if AI seems wrong: substantial engagement + complexity discussed = they explained
      if (!approachExplained && hasSubstantialEngagement && Boolean(parsed.complexityDiscussed)) {
        logger.warn(
          "[AI Validation] Overriding approachExplained - substantial engagement with complexity discussion detected",
          {
            candidateMessageCount: candidateMessages.length,
            avgMessageLength: Math.round(avgMessageLength),
            complexityDiscussed: parsed.complexityDiscussed,
            originalApproachExplained: parsed.approachExplained,
          }
        )
        approachExplained = true
        approachQuality = approachQuality === "none" ? "basic" : approachQuality
        // Boost communication score if it seems too low for the engagement level
        if (communicationScore < 55) {
          communicationScore = Math.max(communicationScore, 60)
        }
      }

      // CRITICAL: If interviewer praised communication, AI validation is definitely wrong
      // This is the strongest signal - the interviewer in the session said they communicated well
      if (interviewerPraisedCommunication && communicationScore < 70) {
        logger.warn(
          "[AI Validation] Overriding low score - interviewer praised communication in transcript",
          {
            originalScore: communicationScore,
            newScore: 75,
            originalApproachExplained: parsed.approachExplained,
          }
        )
        approachExplained = true
        if (approachQuality === "none" || approachQuality === "poor") {
          approachQuality = "good"
        }
        communicationScore = Math.max(communicationScore, 75)
      }

      // ADDITIONAL SAFETY NET: If user has substantial engagement AND explained approach
      // AND discussed complexity, the communication score should reflect good communication
      // This catches cases where AI returns "basic" (50) for legitimately good sessions
      if (
        approachExplained &&
        Boolean(parsed.complexityDiscussed) &&
        hasSubstantialEngagement &&
        communicationScore < 65
      ) {
        // Calculate expected minimum based on quality
        const qualityMinimumMap: Record<string, number> = {
          excellent: 80,
          good: 70,
          basic: 60,
          poor: 45,
          none: 30,
        }
        const qualityMinimum = qualityMinimumMap[approachQuality] || 50

        if (communicationScore < qualityMinimum) {
          logger.warn(
            "[AI Validation] Boosting communication score - approach explained + complexity discussed deserves higher score",
            {
              originalScore: communicationScore,
              newScore: qualityMinimum,
              approachQuality,
              complexityDiscussed: parsed.complexityDiscussed,
              edgeCasesConsidered,
            }
          )
          communicationScore = qualityMinimum
        }
      }

      // Bonus for edge case discussion - this shows proactive thinking
      if (edgeCasesConsidered && communicationScore < 75) {
        communicationScore = Math.min(80, communicationScore + 5)
      }

      // Log validation results for debugging
      logger.info("[AI Validation] Result", {
        edgeCasesConsidered,
        approachExplained,
        complexityDiscussed: Boolean(parsed.complexityDiscussed),
        communicationScore,
        candidateMessageCount: candidateMessages.length,
      })

      return {
        isCoherent: Boolean(parsed.isCoherent),
        responsesRelevant: Boolean(parsed.responsesRelevant),
        approachExplained,
        approachQuality,
        complexityDiscussed: Boolean(parsed.complexityDiscussed),
        complexityAccurate: Boolean(parsed.complexityAccurate),
        statedComplexity: parsed.statedComplexity || null,
        questionsAsked: Number(parsed.questionsAsked) || interviewerQuestions,
        questionsAnswered: Number(parsed.questionsAnswered) || 0,
        edgeCasesConsidered,
        alternativesDiscussed: Boolean(parsed.alternativesDiscussed),
        communicationScore,
      }
    }
  } catch (error) {
    logger.error("AI validation parsing error", { error })
  }

  // Fallback if AI validation fails
  return getDefaultValidation()
}

/**
 * Default validation when AI call fails or is skipped
 * Defaults are CONSERVATIVE - assume no communication happened
 */
export function getDefaultValidation(): ConversationValidation {
  return {
    isCoherent: true,
    responsesRelevant: true,
    approachExplained: false,
    approachQuality: "none",
    complexityDiscussed: false,
    complexityAccurate: false,
    statedComplexity: null,
    questionsAsked: 0,
    questionsAnswered: 0,
    edgeCasesConsidered: false,
    alternativesDiscussed: false,
    communicationScore: 25, // Low default - must earn through actual communication
  }
}
