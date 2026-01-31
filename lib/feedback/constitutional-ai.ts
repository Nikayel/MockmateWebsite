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
  ScoreAdjustmentSummary,
} from "./types"
import { generateAIResponse } from "@/lib/ai-providers"
import { logger } from "@/lib/logger"
import type { ExtractedEvidence } from "./structured-extraction"
import { buildEvidenceSummary } from "./structured-extraction"
import { FEEDBACK_PRINCIPLES, CORE_PRINCIPLES } from "@/lib/prompts"
import { calculatePerformanceScore } from "@/lib/constants"
import { persistConstitutionalAIIntervention } from "@/lib/scoring/analytics-persistence"
import type {
  ConstitutionalAIIntervention,
  ScoreCategoryAdjustment,
  CritiqueAspect,
} from "@/lib/scoring/analytics-types"

// ============================================================================
// SCORE CRITIQUE
// ============================================================================

/**
 * Generate user-friendly score change explanations
 * Called when AI doesn't provide scoreChanges (backwards compatibility)
 */
function generateScoreChanges(
  original: ScoreResult | ExtendedScoreResult,
  adjusted: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
    overall: number
  }
): ScoreAdjustmentSummary[] {
  const changes: ScoreAdjustmentSummary[] = []

  const categories: Array<{
    key: keyof typeof adjusted
    label: ScoreAdjustmentSummary["category"]
    increaseReason: string
    decreaseReason: string
  }> = [
    {
      key: "understanding",
      label: "Understanding",
      increaseReason: "Your grasp of the problem deserved more credit",
      decreaseReason: "Adjusted to reflect understanding demonstrated",
    },
    {
      key: "problemSolving",
      label: "Problem-Solving",
      increaseReason: "Your problem-solving approach was stronger than initially scored",
      decreaseReason: "Adjusted for accuracy in problem-solving assessment",
    },
    {
      key: "codeQuality",
      label: "Code Quality",
      increaseReason: "Your code quality deserved a higher score",
      decreaseReason: "Adjusted to reflect code quality more accurately",
    },
    {
      key: "communication",
      label: "Communication",
      increaseReason: "Your explanation and communication were better than initially credited",
      decreaseReason: "Adjusted for more accurate communication assessment",
    },
  ]

  for (const cat of categories) {
    const origScore = original[cat.key] as number
    const adjScore = adjusted[cat.key]
    if (origScore !== adjScore) {
      changes.push({
        category: cat.label,
        original: origScore,
        adjusted: adjScore,
        reason: adjScore > origScore ? cat.increaseReason : cat.decreaseReason,
      })
    }
  }

  return changes
}

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
      "issue": "Brief description of the problem (internal)",
      "suggestion": "Specific fix (internal)"
    }
  ],
  "adjustedScores": {
    "understanding": number,
    "problemSolving": number,
    "codeQuality": number,
    "communication": number,
    "overall": number
  },
  "reasoning": "Technical reasoning (internal, 1 sentence)",
  "madeChanges": true/false,
  "userSummary": "A friendly 1-sentence summary for the user explaining what was corrected, e.g., 'We noticed your optimal solution wasn't fully credited and adjusted your score.'",
  "scoreChanges": [
    {
      "category": "Understanding|Problem-Solving|Code Quality|Communication",
      "original": number,
      "adjusted": number,
      "reason": "Plain English explanation for the user, e.g., 'Your clear explanation of the approach deserved more credit'"
    }
  ]
}

IMPORTANT FOR USER-FACING FIELDS (userSummary and scoreChanges):
- Write like you're explaining to a friend, not a QA report
- Focus on the BENEFIT to the user ("we gave you more credit for X")
- Never mention internal terms like "extracted evidence", "transcript", "validation"
- Never expose our grading internals or data structures
- Keep explanations positive and encouraging
- Example GOOD: "Your working solution deserved a higher score"
- Example BAD: "The extracted evidence contradicted the performance context flags"

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

        // Generate scoreChanges if AI didn't provide them (backwards compatibility)
        if (!result.scoreChanges && result.adjustedScores) {
          result.scoreChanges = generateScoreChanges(scores, result.adjustedScores)
        }

        // Generate userSummary if AI didn't provide it
        if (!result.userSummary && result.madeChanges) {
          const delta = result.adjustedScores.overall - scores.overall
          if (delta > 0) {
            result.userSummary = `We reviewed your grading and adjusted your score by +${delta} points to better reflect your performance.`
          } else if (delta < 0) {
            result.userSummary = `We reviewed your grading and made minor adjustments for accuracy.`
          }
        }

        logger.info("[Constitutional AI] Score adjustment made", {
          original: scores,
          adjusted: result.adjustedScores,
          critiques: result.critiques,
          reasoning: result.reasoning,
          userSummary: result.userSummary,
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
    // Evidence from transcript extraction for fact-checking
    extractedEvidence?: ExtractedEvidence
    // Raw transcript for ground-truth verification (in case extraction failed)
    conversationTranscript?: Array<{ role: string; content: string }>
  }
): Promise<FeedbackCritiqueAdjustment> {
  // Build evidence summary if available
  const evidenceSummary = context.extractedEvidence
    ? buildEvidenceSummary(context.extractedEvidence)
    : null

  // Build raw transcript summary for ground-truth verification
  // This catches cases where extraction failed but the raw transcript has the evidence
  const transcriptSummary = context.conversationTranscript?.length
    ? context.conversationTranscript
        .filter((m) => m.role === "candidate")
        .slice(0, 15) // First 15 candidate messages
        .map((m, i) => `[${i}] ${m.content.substring(0, 200)}`)
        .join("\n")
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
}${
    transcriptSummary
      ? `
RAW CANDIDATE MESSAGES (ground-truth verification):
${transcriptSummary}

IMPORTANT: If extracted evidence above seems incomplete, check these raw messages for:
- Complexity discussion: Look for "O(n)", "time complexity", "space complexity", "o n", "linear"
- Approach explanation: Look for "I'll use", "my approach", "I'm thinking", "hash map", "bucket"
- Edge cases: Look for "empty", "null", "edge case", "what if"
If candidate discussed these but feedback criticizes them for NOT discussing, that's an ACCURACY VIOLATION.
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
      "issue": "What's wrong (internal)",
      "suggestion": "How to fix it (internal)"
    }
  ],
  "revisedFeedback": "Full rewritten feedback (only if absolutely necessary)",
  "reasoning": "Technical reasoning (internal, 1 sentence)",
  "madeChanges": true/false,
  "userSummary": "A friendly 1-sentence summary for the user, e.g., 'We refined the feedback to better reflect your actual performance.'"
}

IMPORTANT FOR userSummary:
- Write conversationally, like explaining to a friend
- Focus on the benefit ("refined for accuracy", "corrected to give you proper credit")
- Never mention internal terms like "extracted evidence", "transcript analysis", "validation"
- Keep it positive and brief

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

// ============================================================================
// ANALYTICS TRACKING
// ============================================================================

/**
 * Track Constitutional AI intervention for analytics
 * Call this after both score and feedback critiques are complete
 */
export async function trackConstitutionalAIIntervention(params: {
  sessionId: string
  userId: string
  scenarioType: "dsa" | "system_design" | "bug_fix"
  scenarioId: string
  scenarioTitle: string
  originalScores: ScoreResult | ExtendedScoreResult
  scoreCritique: ScoreCritiqueAdjustment
  feedbackCritique?: FeedbackCritiqueAdjustment | null // Made optional - feedback critique removed
  context: {
    testPassRate: number
    codeIncomplete: boolean
    silentSolution: boolean
    hasBlindCopying: boolean
    extractedEvidence?: ExtractedEvidence
    aiValidation?: ConversationValidation
  }
}): Promise<void> {
  try {
    const {
      sessionId,
      userId,
      scenarioType,
      scenarioId,
      scenarioTitle,
      originalScores,
      scoreCritique,
      feedbackCritique,
      context,
    } = params

    // Build category adjustments from score critique
    const categoryAdjustments: ScoreCategoryAdjustment[] = []

    if (scoreCritique.madeChanges && scoreCritique.adjustedScores) {
      const categories: Array<{
        key: keyof typeof scoreCritique.adjustedScores
        category: ScoreCategoryAdjustment["category"]
      }> = [
        { key: "understanding", category: "understanding" },
        { key: "problemSolving", category: "problemSolving" },
        { key: "codeQuality", category: "codeQuality" },
        { key: "communication", category: "communication" },
      ]

      for (const { key, category } of categories) {
        const original = originalScores[key] as number
        const adjusted = scoreCritique.adjustedScores[key]
        const delta = adjusted - original

        if (delta !== 0) {
          categoryAdjustments.push({
            category,
            originalScore: original,
            adjustedScore: adjusted,
            delta,
            direction: delta > 0 ? "increased" : "decreased",
            reason:
              scoreCritique.scoreChanges?.find(
                (c) => c.category.toLowerCase().replace("-", "") === category.toLowerCase()
              )?.reason || scoreCritique.reasoning,
          })
        }
      }
    }

    // Extract aspects violated from critiques
    const scoreAspectsViolated: CritiqueAspect[] = scoreCritique.critiques
      .filter((c) => !c.passed)
      .map((c) => c.aspect as CritiqueAspect)

    const feedbackAspectsViolated: CritiqueAspect[] =
      feedbackCritique?.critiques
        ?.filter((c) => !c.passed)
        ?.map((c) => c.aspect as CritiqueAspect) ?? []

    // Build the intervention record
    const intervention: ConstitutionalAIIntervention = {
      sessionId,
      userId,
      timestamp: new Date().toISOString(),
      scenarioType,
      scenarioId,
      scenarioTitle,
      scoreCritique: {
        triggered: true,
        aspectsViolated: scoreAspectsViolated,
        madeChanges: scoreCritique.madeChanges,
        originalOverall: originalScores.overall,
        adjustedOverall: scoreCritique.adjustedScores?.overall ?? originalScores.overall,
        overallDelta:
          (scoreCritique.adjustedScores?.overall ?? originalScores.overall) -
          originalScores.overall,
        categoryAdjustments,
        reasoning: scoreCritique.reasoning,
        evidenceFloorApplied: scoreCritique.reasoning?.includes("Evidence-based floor") ?? false,
        evidenceFloorReason: scoreCritique.reasoning?.includes("Evidence-based floor")
          ? scoreCritique.reasoning
          : undefined,
      },
      feedbackCritique: {
        triggered: !!feedbackCritique,
        aspectsViolated: feedbackAspectsViolated,
        madeChanges: feedbackCritique?.madeChanges ?? false,
        reasoning: feedbackCritique?.reasoning,
      },
      context: {
        testPassRate: context.testPassRate,
        codeIncomplete: context.codeIncomplete,
        silentSolution: context.silentSolution,
        hasBlindCopying: context.hasBlindCopying,
        communicationQuotesFound: context.extractedEvidence?.communication.quotes.length ?? 0,
        approachExplained:
          context.extractedEvidence?.approach.explained ??
          context.aiValidation?.approachExplained ??
          false,
        complexityDiscussed:
          context.extractedEvidence?.timeComplexity.mentioned ??
          context.aiValidation?.complexityDiscussed ??
          false,
      },
    }

    // Persist asynchronously (non-blocking)
    persistConstitutionalAIIntervention(intervention).catch((error) => {
      logger.error("[Constitutional AI Analytics] Failed to persist intervention", {
        error,
        sessionId,
      })
    })
  } catch (error) {
    // Non-blocking - don't fail the main flow if analytics fails
    logger.error("[Constitutional AI Analytics] Failed to track intervention", { error })
  }
}
