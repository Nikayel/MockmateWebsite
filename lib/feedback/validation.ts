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
 * Heuristic-based approach detection as a safety net
 * Detects obvious signs of approach explanation that AI might miss
 */
function detectApproachHeuristically(candidateMessages: Array<{ content: string }>): {
  explained: boolean
  quality: string
  complexityMentioned: boolean
  edgeCasesMentioned: boolean
} {
  const allContent = candidateMessages.map((m) => m.content.toLowerCase()).join(" ")

  // Approach keywords/phrases
  const approachPatterns = [
    /\b(two pointers?|sliding window|hash ?map|hash ?set|dictionary|freq|bucket|sort|heap|stack|queue|bfs|dfs|binary search|dp|dynamic programming|recursion|memoiz)/i,
    /\b(i('ll|'m going to|want to|can|could|would) (use|try|loop|iterate|check|compare|add|remove|keep track))/i,
    /\b(approach|strategy|idea|solution|algorithm|method|way to solve)/i,
    /\b(first|then|after that|next|finally|so what i)/i,
    /\b(time complexity|space complexity|o\s*\(|o\s*of\s*n|linear|constant|quadratic|log)/i,
    /\b(brute force|optimiz|more efficient|better approach)/i,
    /\b(loop over|iterate through|traverse|walk through)/i,
    /\b(as (i|we) (loop|iterate|go|move)|while (we|i) (have|loop))/i,
  ]

  // Complexity patterns - including voice transcription variants
  // Voice input may produce: "o n" instead of "O(n)", "oh one" instead of "O(1)"
  const complexityPatterns = [
    // Standard notation with parentheses
    /\bo\s*\(\s*n\s*\)/i,
    /\bo\s*\(\s*1\s*\)/i,
    /\bo\s*\(\s*n\s*log\s*n\s*\)/i,
    /\bo\s*\(\s*n\s*(squared|²|\^2|square)\s*\)/i,
    // Voice transcription variants (without parentheses)
    /\bo\s+of?\s*n\b/i, // "o of n", "o n"
    /\bo\s+n\b/i, // "o n" (common voice transcription)
    /\boh\s*n\b/i, // "oh n" (misheard O(n))
    /\bo\s+of?\s*one\b/i, // "o of one", "o one"
    /\bo\s+one\b/i, // "o one" (voice for O(1))
    /\boh\s*one\b/i, // "oh one"
    /\bo\s+of?\s*1\b/i, // "o of 1", "o 1"
    /\bo\s+1\b/i, // "o 1"
    /\bo\s+n\s*log\s*n\b/i, // "o n log n"
    /\bo\s+of\s*n\s*log\s*n\b/i, // "o of n log n"
    /\bo\s+n\s*(squared?|square)\b/i, // "o n squared"
    // Standard terms
    /\btime complexity/i,
    /\bspace complexity/i,
    /\blinear( time)?/i,
    /\bconstant( space| time)?/i,
    /\bquadratic/i,
    /\blogarithmic/i,
  ]

  // Edge case patterns
  const edgeCasePatterns = [
    /\b(empty|null|none|zero|single|one element|edge case|boundary|special case)/i,
    /\b(what if|if it's empty|if there's nothing|if the (string|array|input) is)/i,
    /\b(negative|duplicate|unicode|lowercase|uppercase)/i,
  ]

  const approachMatches = approachPatterns.filter((p) => p.test(allContent)).length
  const complexityMatches = complexityPatterns.filter((p) => p.test(allContent)).length
  const edgeCaseMatches = edgeCasePatterns.filter((p) => p.test(allContent)).length

  // Check for substantial explanation (long messages explaining logic)
  const substantialExplanations = candidateMessages.filter(
    (m) =>
      m.content.length > 150 && // Long message
      (approachPatterns.some((p) => p.test(m.content.toLowerCase())) || // Contains approach keywords
        /\b(so|because|the reason|which means|that way|this will|this would)\b/i.test(m.content)) // Contains explanation connectors
  ).length

  const explained = approachMatches >= 2 || substantialExplanations >= 1

  let quality = "none"
  if (explained) {
    if (approachMatches >= 4 || substantialExplanations >= 2) {
      quality = "good"
    } else if (approachMatches >= 2 || substantialExplanations >= 1) {
      quality = "basic"
    }
  }

  return {
    explained,
    quality,
    complexityMentioned: complexityMatches >= 1,
    edgeCasesMentioned: edgeCaseMatches >= 1,
  }
}

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
  // Run heuristic detection first as a safety net
  const candidateMessages = transcript.filter((m) => m.role === "candidate" || m.role === "user")
  const heuristicResult = detectApproachHeuristically(candidateMessages)

  logger.info("[AI Validation] Heuristic detection result", {
    explained: heuristicResult.explained,
    quality: heuristicResult.quality,
    complexityMentioned: heuristicResult.complexityMentioned,
    edgeCasesMentioned: heuristicResult.edgeCasesMentioned,
    candidateMessageCount: candidateMessages.length,
  })

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
  "statedComplexity": "EXACT complexity they stated" or null,
  "questionsAsked": ${interviewerQuestions},
  "questionsAnswered": number,
  "edgeCasesConsidered": true/false,
  "alternativesDiscussed": true/false,
  "communicationScore": 0-100
}

IMPORTANT for statedComplexity:
- Extract the EXACT complexity value the candidate stated (e.g., "O(n)", "O(n²)", "O(n log n)")
- Voice transcription may produce: "o n square" = O(n²), "o n 2" = O(n²), "o n squared" = O(n²)
- "quadratic" or "n squared" = O(n²)
- "linear" = O(n), "constant" = O(1)
- If they said multiple complexities, use the LAST one they settled on

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

CRITICAL: Silent coding (no explanation at all) = communication score around 10-15.
Zero communication should be severely punished - even correct solutions without explanation deserve ~10-15.
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

    // Log raw AI validation response
    logger.info("[AI Validation] Raw response from AI", {
      provider: response.provider,
      latencyMs: response.latencyMs,
      responseLength: response.text.length,
      responsePreview: response.text.substring(0, 300),
    })

    // Parse AI response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])

      // Log parsed values before any adjustments
      logger.info("[AI Validation] Parsed AI response (before adjustments)", {
        approachExplained: parsed.approachExplained,
        approachQuality: parsed.approachQuality,
        complexityDiscussed: parsed.complexityDiscussed,
        rawCommunicationScore: parsed.communicationScore,
        edgeCasesConsidered: parsed.edgeCasesConsidered,
        questionsAnswered: parsed.questionsAnswered,
        alternativesDiscussed: parsed.alternativesDiscussed,
      })

      // Calculate engagement metrics from transcript for sanity checks
      const candidateMessages = transcript.filter((m) => m.role === "candidate")
      const totalCandidateChars = candidateMessages.reduce((sum, m) => sum + m.content.length, 0)
      const avgMessageLength = totalCandidateChars / Math.max(1, candidateMessages.length)

      // Voice transcription creates many short messages, so use TOTAL content as additional signal
      // 400 chars total = ~80 words = reasonable explanation
      const hasTotalContentEngagement = totalCandidateChars >= 400 && candidateMessages.length >= 3
      const hasSubstantialEngagement =
        (candidateMessages.length >= 5 && avgMessageLength >= 80) || hasTotalContentEngagement

      // Log engagement metrics for debugging
      logger.info("[AI Validation] Engagement metrics", {
        candidateMessageCount: candidateMessages.length,
        totalCandidateChars,
        avgMessageLength: Math.round(avgMessageLength),
        hasTotalContentEngagement,
        hasSubstantialEngagement,
      })

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
      let edgeCasesConsidered = Boolean(parsed.edgeCasesConsidered)
      let complexityDiscussed = Boolean(parsed.complexityDiscussed)

      // HEURISTIC SAFETY NET: If heuristics detect approach but AI didn't, override
      // This catches cases where AI is wrong due to voice transcription artifacts or model errors
      if (!approachExplained && heuristicResult.explained) {
        logger.warn(
          "[AI Validation] Overriding with heuristic detection - AI missed approach explanation",
          {
            aiApproachExplained: parsed.approachExplained,
            heuristicExplained: heuristicResult.explained,
            heuristicQuality: heuristicResult.quality,
          }
        )
        approachExplained = true
        approachQuality = heuristicResult.quality || "basic"
      }

      // Also use heuristics to boost complexity and edge case detection
      if (!complexityDiscussed && heuristicResult.complexityMentioned) {
        logger.info("[AI Validation] Heuristic detected complexity discussion missed by AI")
        complexityDiscussed = true
      }
      if (!edgeCasesConsidered && heuristicResult.edgeCasesMentioned) {
        logger.info("[AI Validation] Heuristic detected edge cases missed by AI")
        edgeCasesConsidered = true
      }

      // Override if AI seems wrong: substantial engagement + complexity discussed = they explained
      if (!approachExplained && hasSubstantialEngagement && complexityDiscussed) {
        logger.warn(
          "[AI Validation] Overriding approachExplained - substantial engagement with complexity discussion detected",
          {
            candidateMessageCount: candidateMessages.length,
            avgMessageLength: Math.round(avgMessageLength),
            complexityDiscussed,
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

      // ADDITIONAL SAFETY NET: If user explained approach AND discussed complexity,
      // the communication score should reflect good communication
      // This catches cases where AI returns unreasonably low scores for legitimately good sessions
      // Relaxed: don't require hasSubstantialEngagement - trust the AI's boolean flags
      if (approachExplained && Boolean(parsed.complexityDiscussed) && communicationScore < 65) {
        // Calculate expected minimum based on quality - raised minimums to be more fair
        const qualityMinimumMap: Record<string, number> = {
          excellent: 85,
          good: 75,
          basic: 65,
          poor: 50,
          none: 35,
        }
        const qualityMinimum = qualityMinimumMap[approachQuality] || 55

        // Additional boost if edge cases were discussed - shows thorough communication
        const edgeCaseBonus = edgeCasesConsidered ? 5 : 0
        const finalMinimum = Math.min(90, qualityMinimum + edgeCaseBonus)

        if (communicationScore < finalMinimum) {
          logger.warn(
            "[AI Validation] Boosting communication score - approach explained + complexity discussed deserves higher score",
            {
              originalScore: communicationScore,
              newScore: finalMinimum,
              approachQuality,
              complexityDiscussed: parsed.complexityDiscussed,
              edgeCasesConsidered,
              edgeCaseBonus,
            }
          )
          communicationScore = finalMinimum
        }
      }

      // Bonus for edge case discussion - this shows proactive thinking
      if (edgeCasesConsidered && communicationScore < 75) {
        communicationScore = Math.min(80, communicationScore + 5)
      }

      // Log validation results for debugging
      logger.info("[AI Validation] Final result (after all adjustments)", {
        edgeCasesConsidered,
        approachExplained,
        approachQuality,
        complexityDiscussed,
        communicationScore,
        candidateMessageCount: candidateMessages.length,
        heuristicOverrideUsed: heuristicResult.explained && !Boolean(parsed.approachExplained),
      })

      return {
        isCoherent: Boolean(parsed.isCoherent),
        responsesRelevant: Boolean(parsed.responsesRelevant),
        approachExplained,
        approachQuality,
        complexityDiscussed, // Use the potentially-updated variable
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
