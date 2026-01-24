/**
 * Constitutional AI critique functions
 *
 * This module implements Constitutional AI principles to review and improve
 * both scoring and feedback text for fairness, accuracy, tone, and actionability.
 *
 * Uses centralized prompts from: lib/prompts/
 * - FEEDBACK_PRINCIPLES: Tone, evidence rules, constitutional rules
 * - DSA_RUBRIC, SYSTEM_DESIGN_RUBRIC: Evaluation criteria
 */

import type {
  ScoreCritiqueAdjustment,
  FeedbackCritiqueAdjustment,
  ConversationValidation,
  ScoreResult,
  ExtendedScoreResult,
} from "./types"
import { generateAIResponse } from "@/lib/ai-providers"
import { logger } from "@/lib/logger"
import type { ExtractedEvidence } from "./structured-extraction"
import { buildEvidenceSummary } from "./structured-extraction"
import { FEEDBACK_PRINCIPLES, CORE_PRINCIPLES } from "@/lib/prompts"
import { calculatePerformanceScore } from "@/lib/constants"

// ============================================================================
// SCORE CRITIQUE
// ============================================================================

/**
 * Constitutional AI: Critique calculated scores for fairness
 *
 * Principles enforced:
 * - Fairness: Scores should match performance reality
 * - Harmlessness: Don't over-penalize learners for honest mistakes
 * - Honesty: Don't inflate scores for incomplete work
 * - Helpfulness: Scores should guide improvement
 */
/**
 * Pre-validate evidence before Constitutional AI critique
 * Prevents AI from wrongly reducing scores when evidence shows communication
 */
function validateEvidenceAgainstScores(
  evidence: ExtractedEvidence | undefined,
  currentCommunicationScore: number
): { shouldEnforceFloor: boolean; minScore: number; reason: string } {
  if (!evidence) {
    return { shouldEnforceFloor: false, minScore: 10, reason: "No evidence" }
  }

  const hasCommunicationQuotes = evidence.communication.quotes.length > 0
  const hasApproachQuote = evidence.approach.explained && evidence.approach.quote
  const hasComplexityQuote = evidence.timeComplexity.mentioned && evidence.timeComplexity.quote

  // If ANY of these are true, they are NOT a silent coder
  if (hasCommunicationQuotes || hasApproachQuote || hasComplexityQuote) {
    let minScore = 50 // Base for any communication
    if (hasApproachQuote) minScore += 10
    if (hasComplexityQuote) minScore += 10
    minScore = Math.min(80, minScore)

    return {
      shouldEnforceFloor: currentCommunicationScore < minScore,
      minScore,
      reason: `Evidence: ${[hasApproachQuote && "approach", hasComplexityQuote && "complexity", hasCommunicationQuotes && "quotes"].filter(Boolean).join(", ")}`,
    }
  }

  return { shouldEnforceFloor: false, minScore: 10, reason: "No communication evidence" }
}

export async function critiqueScores(
  scores: ScoreResult | ExtendedScoreResult,
  context: {
    passRate: number
    scenarioType: string
    aiValidation: ConversationValidation
    codeCompleteness?: { isIncomplete: boolean; reason: string }
    hasBlindCopying?: boolean
    // NEW: Structured evidence from transcript extraction
    extractedEvidence?: ExtractedEvidence
    problemContext?: {
      title: string
      optimalTimeComplexity: string
      optimalSpaceComplexity: string
    }
    // NEW: Pass actual conversation for ground-truth verification
    conversationTranscript?: Array<{ role: string; content: string }>
  }
): Promise<ScoreCritiqueAdjustment> {
  const silentSolution = "silentSolution" in scores ? scores.silentSolution : false

  // Build evidence summary if available
  const evidenceSummary = context.extractedEvidence
    ? buildEvidenceSummary(context.extractedEvidence)
    : null

  const critiquePrompt = `You are a Constitutional AI reviewer ensuring fair, helpful, and honest scoring.

CURRENT SCORES (0-100 scale):
- Understanding: ${scores.understanding}
- Problem-Solving: ${scores.problemSolving}
- Code Quality: ${scores.codeQuality}
- Communication: ${scores.communication}
- Overall: ${scores.overall}

PERFORMANCE CONTEXT:
- Test pass rate: ${context.passRate}%
- Scenario type: ${context.scenarioType}
- Approach explained: ${context.aiValidation.approachExplained}
- Approach quality: ${context.aiValidation.approachQuality}
- Communication score: ${context.aiValidation.communicationScore}
${context.codeCompleteness?.isIncomplete ? `- Code incomplete: ${context.codeCompleteness.reason}` : ""}
${context.hasBlindCopying ? "- AI copying detected" : ""}
${silentSolution ? "- Silent solution (no explanation)" : ""}
${
  context.problemContext
    ? `
PROBLEM CONTEXT:
- Problem: ${context.problemContext.title}
- Optimal Time: ${context.problemContext.optimalTimeComplexity}
- Optimal Space: ${context.problemContext.optimalSpaceComplexity}
`
    : ""
}
${
  evidenceSummary
    ? `
EXTRACTED EVIDENCE FROM TRANSCRIPT (use this to verify claims):
${evidenceSummary}

IMPORTANT: Use the extracted evidence above to verify if scores match what actually happened.
- If evidence shows candidate mentioned edge cases, don't penalize for "not mentioning edge cases"
- If evidence shows candidate discussed complexity, don't claim they didn't
- If evidence shows candidate self-corrected bugs, give credit (positive signal)
- If evidence shows candidate improved from brute force to optimal, give credit for progression
- CRITICAL: If the transcript shows the candidate explaining their approach (mentioning algorithms, data structures, or step-by-step logic), they are NOT a "silent solution" - do NOT lower communication score
`
    : ""
}${
    context.conversationTranscript && context.conversationTranscript.length > 0
      ? `
ACTUAL CONVERSATION TRANSCRIPT (source of truth - use this to verify claims):
${context.conversationTranscript
  .slice(-20) // Last 20 messages for context
  .map(
    (m) =>
      `[${m.role.toUpperCase()}]: ${m.content.slice(0, 200)}${m.content.length > 200 ? "..." : ""}`
  )
  .join("\n")}

CRITICAL: Read the transcript above to verify:
1. Did the candidate actually explain their approach? Look for explanations of logic/algorithm.
2. Did they discuss complexity? Look for "O(n)", "log n", "linear", "constant", etc.
3. Did they communicate while coding? Look for narration during implementation.
4. If transcript shows communication but scores are low, this is an ACCURACY violation.
`
      : ""
  }

CONSTITUTIONAL PRINCIPLES - Critique against these 4 aspects:

1. FAIRNESS: Do scores accurately reflect performance?
   - Are penalties proportional to actual mistakes?
   - Is someone being unfairly punished for minor issues?
   - Example violation: Communication=20 when they explained well but didn't use specific keywords

2. TONE (Harmlessness): Are scores discouraging vs. constructive?
   - Are we being overly harsh on learners?
   - Would these scores demotivate someone trying their best?
   - Example violation: Overall=15 for someone who submitted incomplete work but showed effort

3. ACCURACY (Honesty): Are scores truthful?
   - Do scores match what actually happened?
   - Are we inflating scores for political correctness?
   - Example violation: Code Quality=70 when solution doesn't work

4. ACTIONABILITY (Helpfulness): Do scores guide improvement?
   - Can the student understand WHY they got this score?
   - Is the gap between current and good performance clear?
   - Example violation: All scores uniformly low without clear differentiation

CRITICAL RULES:
- Only flag if there's a CLEAR violation (be conservative)
- Suggest score adjustments ONLY if absolutely necessary (±5-15 points max)
- If scores are reasonable, return empty critiques
- Focus on catching: unfair penalties, demotivating harshness, dishonest inflation

SILENT CODER DETECTION - CHECK EVIDENCE FIRST:
Before reducing communication score for "silent coding", VERIFY with the transcript:

1. IF extracted evidence shows communication.quotes with content:
   -> They communicated. Do NOT reduce score.

2. IF evidence shows approach.explained = YES with quote:
   -> They explained approach. Do NOT treat as silent.

3. IF evidence shows timeComplexity.mentioned = YES with quote:
   -> They discussed complexity. This is GOOD communication.

4. IF the transcript above shows them explaining their logic:
   -> They are NOT a silent coder. Do NOT reduce score.

5. ONLY apply silent coder penalty if ALL of these are true:
   - No communication quotes in evidence
   - No approach explanation with quote
   - No complexity discussion with quote
   - Transcript shows only filler words ("hmm", "ok") or silence

6. If evidence/transcript shows communication but score is low:
   -> This is an ACCURACY violation - score should be RAISED, not lowered.

Example of WRONG critique:
- Evidence shows they explained approach with quote
- Communication score is 55
- AI lowers to 25 "because silent coder"
- THIS IS INCORRECT - evidence proves they communicated

Example of CORRECT critique:
- Evidence shows communication quotes exist
- Communication score is 25
- AI RAISES to 60+ "because evidence shows they communicated"

Return JSON:
{
  "critiques": [
    {
      "aspect": "fairness|tone|accuracy|actionability",
      "passed": false,
      "issue": "Brief description of the problem",
      "suggestion": "Specific fix"
    }
  ],
  "adjustedScores": {
    "understanding": number,
    "problemSolving": number,
    "codeQuality": number,
    "communication": number,
    "overall": number
  },
  "reasoning": "Why adjustments were made (1 sentence)",
  "madeChanges": true/false
}

If no issues found, return:
{
  "critiques": [],
  "reasoning": "Scores are fair and appropriate",
  "madeChanges": false
}`

  try {
    // Constitutional AI critique - uses Gemini 3.0 Flash for better reasoning
    // Gemini has superior context understanding (e.g., "constant time" explanation vs claiming O(1))
    const response = await generateAIResponse(
      "You are a Constitutional AI reviewer. Return only valid JSON, no markdown.",
      critiquePrompt,
      [],
      {
        complexity: "critique",
        temperature: 0.2,
      }
    )

    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]) as ScoreCritiqueAdjustment

      // Validate and fix adjusted scores if present
      if (result.madeChanges && result.adjustedScores) {
        // Recalculate overall from components to ensure consistency
        // Don't trust AI to do the math correctly
        // Uses centralized calculatePerformanceScore from lib/constants.ts
        const recalculatedOverall = calculatePerformanceScore({
          understanding: result.adjustedScores.understanding,
          problemSolving: result.adjustedScores.problemSolving,
          codeQuality: result.adjustedScores.codeQuality,
          communication: result.adjustedScores.communication,
        })

        // If AI's overall differs significantly from recalculated, use recalculated
        const aiOverall = result.adjustedScores.overall
        if (Math.abs(aiOverall - recalculatedOverall) > 5) {
          logger.warn("[Constitutional AI] Overall score mismatch - recalculating", {
            aiProvidedOverall: aiOverall,
            recalculatedOverall,
            components: {
              understanding: result.adjustedScores.understanding,
              problemSolving: result.adjustedScores.problemSolving,
              codeQuality: result.adjustedScores.codeQuality,
              communication: result.adjustedScores.communication,
            },
          })
          result.adjustedScores.overall = recalculatedOverall
        }

        logger.info("[Constitutional AI] Score adjustment made", {
          original: scores,
          adjusted: result.adjustedScores,
          critiques: result.critiques,
          reasoning: result.reasoning,
        })
      }

      // POST-CRITIQUE VALIDATION: Ensure AI didn't reduce score when evidence shows communication
      const evidenceCheck = validateEvidenceAgainstScores(
        context.extractedEvidence,
        scores.communication
      )

      if (evidenceCheck.shouldEnforceFloor) {
        const currentCommScore = result.adjustedScores?.communication ?? scores.communication

        if (currentCommScore < evidenceCheck.minScore) {
          logger.warn("[Constitutional AI] Enforcing evidence-based floor", {
            aiSuggestedScore: currentCommScore,
            enforcedMinimum: evidenceCheck.minScore,
            reason: evidenceCheck.reason,
          })

          // If result has adjusted scores, update them
          if (result.adjustedScores) {
            result.adjustedScores.communication = evidenceCheck.minScore
            result.adjustedScores.overall = calculatePerformanceScore(result.adjustedScores)
          } else {
            // Create adjusted scores with the floor
            result.adjustedScores = {
              understanding: scores.understanding,
              problemSolving: scores.problemSolving,
              codeQuality: scores.codeQuality,
              communication: evidenceCheck.minScore,
              overall: 0, // Will be recalculated
            }
            result.adjustedScores.overall = calculatePerformanceScore(result.adjustedScores)
            result.madeChanges = true
            result.reasoning = `${result.reasoning || ""} Evidence-based floor applied: ${evidenceCheck.reason}.`
          }
        }
      }

      return result
    }
  } catch (error) {
    logger.error("[Constitutional AI] Score critique failed", { error })
  }

  // Fallback: no changes
  return {
    critiques: [],
    reasoning: "Critique failed, using original scores",
    madeChanges: false,
  }
}

// ============================================================================
// FEEDBACK TEXT CRITIQUE
// ============================================================================

/**
 * Constitutional AI: Critique generated feedback text
 *
 * Principles enforced:
 * - Tone: Constructive, not demoralizing
 * - Accuracy: Truthful about performance
 * - Actionability: Clear next steps
 */
export async function critiqueFeedbackText(
  feedback: string,
  scores: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
    overall: number
  },
  context: {
    passRate: number
    scenarioType: string
    isIncomplete: boolean
    // NEW: Evidence from transcript extraction for fact-checking
    extractedEvidence?: ExtractedEvidence
  }
): Promise<FeedbackCritiqueAdjustment> {
  // Build evidence summary if available
  const evidenceSummary = context.extractedEvidence
    ? buildEvidenceSummary(context.extractedEvidence)
    : null

  const critiquePrompt = `You are a Constitutional AI reviewer ensuring helpful, honest, and constructive feedback.

GENERATED FEEDBACK:
${feedback.substring(0, 1500)}${feedback.length > 1500 ? "\n[...truncated for brevity]" : ""}

PERFORMANCE SCORES:
- Overall: ${scores.overall}/100
- Understanding: ${scores.understanding}/100
- Problem-Solving: ${scores.problemSolving}/100
- Code Quality: ${scores.codeQuality}/100
- Communication: ${scores.communication}/100
- Test pass rate: ${context.passRate}%
- Scenario: ${context.scenarioType}
- Incomplete: ${context.isIncomplete}
${
  evidenceSummary
    ? `
EXTRACTED EVIDENCE FROM TRANSCRIPT (use this to verify feedback claims):
${evidenceSummary}

CRITICAL: Compare feedback claims against this evidence!
- If evidence shows "approach.explained: YES" with a quote, feedback must NOT say "didn't explain approach"
- If evidence shows "complexity discussed: YES", feedback must NOT say "didn't discuss complexity"
- If evidence shows edge cases were mentioned, feedback must NOT say "didn't mention edge cases"
- Feedback that contradicts evidence is a SEVERE accuracy violation
`
    : ""
}

CONSTITUTIONAL PRINCIPLES - Critique against these 4 aspects:

1. FAIRNESS: Does feedback accurately represent what happened?
   - Are criticisms backed by evidence?
   - Are achievements recognized?
   - Red flag: Harsh criticism without specific examples

2. TONE: Is feedback constructive and motivating?
   - Does it encourage improvement vs. demoralize?
   - Is language respectful and professional?
   - Red flags: "terrible", "awful", "completely wrong" without constructive guidance

3. ACCURACY: Is feedback truthful?
   - Does it match the actual scores?
   - Are technical claims correct?
   - CRITICAL: Does feedback contradict the extracted evidence above?
   - Red flags: Praising "optimal complexity" when pass rate is low, claiming "explained well" when communication=30
   - CRITICAL RED FLAG: Saying "didn't explain approach" when evidence shows they DID with a quote
   - CRITICAL RED FLAG: Saying "silent coding" when evidence shows they explained before coding

4. ACTIONABILITY: Does feedback give clear next steps?
   - Can the student understand what to improve?
   - Are suggestions specific and concrete?
   - Red flags: Vague advice like "do better" or "study more" without specifics

CRITICAL RULES:
- Only flag SEVERE violations (be conservative)
- Suggest rewrites ONLY if feedback is harmful/misleading
- If feedback is reasonable, return empty critiques
- Focus on: overly harsh tone, factual errors, unclear guidance
- MOST IMPORTANT: Flag if feedback contradicts the extracted evidence

Return JSON:
{
  "critiques": [
    {
      "aspect": "fairness|tone|accuracy|actionability",
      "passed": false,
      "issue": "What's wrong",
      "suggestion": "How to fix it"
    }
  ],
  "revisedFeedback": "Full rewritten feedback (only if absolutely necessary)",
  "reasoning": "Why revision was needed (1 sentence)",
  "madeChanges": true/false
}

If no issues:
{
  "critiques": [],
  "reasoning": "Feedback is constructive and accurate",
  "madeChanges": false
}`

  try {
    // Constitutional AI critique - uses Gemini 3.0 Flash for better reasoning
    // Gemini understands context better (won't misinterpret "constant time" explanations)
    const response = await generateAIResponse(
      "You are a Constitutional AI reviewer. Return only valid JSON, no markdown.",
      critiquePrompt,
      [],
      {
        complexity: "critique",
        temperature: 0.2,
      }
    )

    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]) as FeedbackCritiqueAdjustment

      if (result.madeChanges) {
        logger.info("[Constitutional AI] Feedback revision made", {
          critiques: result.critiques,
          reasoning: result.reasoning,
        })
      }

      return result
    }
  } catch (error) {
    logger.error("[Constitutional AI] Feedback critique failed", { error })
  }

  return {
    critiques: [],
    reasoning: "Critique failed, using original feedback",
    madeChanges: false,
  }
}
