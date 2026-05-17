/**
 * AI-backed conversation validation for interview scoring.
 *
 * This module owns semantic validation of the candidate transcript. It returns
 * normalized signals used by deterministic scoring, but it does not directly
 * calculate final scores.
 */

import { generateAIResponse } from "@/lib/ai-providers"
import { logger } from "@/lib/logger"
import type { ConversationValidation } from "./types"
import { detectApproachHeuristically } from "./conversation-heuristics"
import { getDefaultValidation } from "./validation-defaults"

/**
 * Validate conversation quality with an LLM plus heuristic safety nets.
 * Only called when pre-screening passes basic checks.
 */
export async function validateConversationWithAI(
  transcript: Array<{ role: string; content: string }>,
  code: string,
  actualComplexity: { time: string; space: string } | null
): Promise<ConversationValidation> {
  const candidateMessages = transcript.filter((m) => m.role === "candidate" || m.role === "user")
  const heuristicResult = detectApproachHeuristically(candidateMessages)

  logger.info("[AI Validation] Heuristic detection result", {
    explained: heuristicResult.explained,
    quality: heuristicResult.quality,
    complexityMentioned: heuristicResult.complexityMentioned,
    edgeCasesMentioned: heuristicResult.edgeCasesMentioned,
    candidateMessageCount: candidateMessages.length,
  })

  let messagesToAnalyze: Array<{ role: string; content: string }> = []

  if (transcript.length <= 40) {
    messagesToAnalyze = transcript
  } else {
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
      { complexity: "standard", temperature: 0.1 }
    )

    logger.info("[AI Validation] Raw response from AI", {
      provider: response.provider,
      latencyMs: response.latencyMs,
      responseLength: response.text.length,
      responsePreview: response.text.substring(0, 300),
    })

    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])

      logger.info("[AI Validation] Parsed AI response (before adjustments)", {
        approachExplained: parsed.approachExplained,
        approachQuality: parsed.approachQuality,
        complexityDiscussed: parsed.complexityDiscussed,
        rawCommunicationScore: parsed.communicationScore,
        edgeCasesConsidered: parsed.edgeCasesConsidered,
        questionsAnswered: parsed.questionsAnswered,
        alternativesDiscussed: parsed.alternativesDiscussed,
      })

      const exactCandidateMessages = transcript.filter((m) => m.role === "candidate")
      const totalCandidateChars = exactCandidateMessages.reduce(
        (sum, m) => sum + m.content.length,
        0
      )
      const avgMessageLength = totalCandidateChars / Math.max(1, exactCandidateMessages.length)
      const hasTotalContentEngagement =
        totalCandidateChars >= 400 && exactCandidateMessages.length >= 3
      const hasSubstantialEngagement =
        (exactCandidateMessages.length >= 5 && avgMessageLength >= 80) || hasTotalContentEngagement

      logger.info("[AI Validation] Engagement metrics", {
        candidateMessageCount: exactCandidateMessages.length,
        totalCandidateChars,
        avgMessageLength: Math.round(avgMessageLength),
        hasTotalContentEngagement,
        hasSubstantialEngagement,
      })

      const interviewerMessages = transcript.filter((m) => m.role === "interviewer")
      const interviewerPraisedCommunication = interviewerMessages.some((m) =>
        /communication\s+(was|is)\s+(clear|direct|good|excellent)|communicated?\s+(clearly|well|good)|explained?\s+(clearly|well)|clear\s+explanation|good\s+(work|job)|solid\s+performance|nice\s+work|have\s+a\s+good\s+grasp|I'm\s+satisfied/i.test(
          m.content
        )
      )

      let approachExplained = Boolean(parsed.approachExplained)
      let approachQuality = parsed.approachQuality || "none"
      let communicationScore = Math.min(100, Math.max(0, Number(parsed.communicationScore) || 50))
      let edgeCasesConsidered = Boolean(parsed.edgeCasesConsidered)
      let complexityDiscussed = Boolean(parsed.complexityDiscussed)

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

      if (!complexityDiscussed && heuristicResult.complexityMentioned) {
        logger.info("[AI Validation] Heuristic detected complexity discussion missed by AI")
        complexityDiscussed = true
      }
      if (!edgeCasesConsidered && heuristicResult.edgeCasesMentioned) {
        logger.info("[AI Validation] Heuristic detected edge cases missed by AI")
        edgeCasesConsidered = true
      }

      if (!approachExplained && hasSubstantialEngagement && complexityDiscussed) {
        logger.warn(
          "[AI Validation] Overriding approachExplained - substantial engagement with complexity discussion detected",
          {
            candidateMessageCount: exactCandidateMessages.length,
            avgMessageLength: Math.round(avgMessageLength),
            complexityDiscussed,
            originalApproachExplained: parsed.approachExplained,
          }
        )
        approachExplained = true
        approachQuality = approachQuality === "none" ? "basic" : approachQuality
        if (communicationScore < 55) {
          communicationScore = Math.max(communicationScore, 60)
        }
      }

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

      if (approachExplained && Boolean(parsed.complexityDiscussed) && communicationScore < 65) {
        const qualityMinimumMap: Record<string, number> = {
          excellent: 85,
          good: 75,
          basic: 65,
          poor: 50,
          none: 35,
        }
        const qualityMinimum = qualityMinimumMap[approachQuality] || 55
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

      if (edgeCasesConsidered && communicationScore < 75) {
        communicationScore = Math.min(80, communicationScore + 5)
      }

      logger.info("[AI Validation] Final result (after all adjustments)", {
        edgeCasesConsidered,
        approachExplained,
        approachQuality,
        complexityDiscussed,
        communicationScore,
        candidateMessageCount: exactCandidateMessages.length,
        heuristicOverrideUsed: heuristicResult.explained && !Boolean(parsed.approachExplained),
      })

      return {
        isCoherent: Boolean(parsed.isCoherent),
        responsesRelevant: Boolean(parsed.responsesRelevant),
        approachExplained,
        approachQuality,
        complexityDiscussed,
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

  return getDefaultValidation()
}
