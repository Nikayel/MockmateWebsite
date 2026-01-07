/**
 * Constitutional AI critique functions
 *
 * This module implements Constitutional AI principles to review and improve
 * both scoring and feedback text for fairness, accuracy, tone, and actionability.
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
export async function critiqueScores(
  scores: ScoreResult | ExtendedScoreResult,
  context: {
    passRate: number
    scenarioType: string
    aiValidation: ConversationValidation
    codeCompleteness?: { isIncomplete: boolean; reason: string }
    hasBlindCopying?: boolean
  }
): Promise<ScoreCritiqueAdjustment> {
  const silentSolution = "silentSolution" in scores ? scores.silentSolution : false

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
    // Use a DIFFERENT provider than the main scoring to ensure independent critique
    // Main scoring uses Gemini, so use Deepseek here for true Constitutional AI
    // Deepseek is excellent at reasoning/critique tasks and much cheaper than Claude
    const response = await generateAIResponse(
      "You are a Constitutional AI reviewer. Return only valid JSON, no markdown.",
      critiquePrompt,
      [],
      {
        complexity: "simple",
        temperature: 0.2,
        preferredProvider: "deepseek", // IMPORTANT: Different provider for true Constitutional AI (cheaper than Claude)
      }
    )

    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]) as ScoreCritiqueAdjustment

      // Validate and fix adjusted scores if present
      if (result.madeChanges && result.adjustedScores) {
        // Recalculate overall from components to ensure consistency
        // Don't trust AI to do the math correctly
        const recalculatedOverall = Math.round(
          result.adjustedScores.understanding * 0.3 +
            result.adjustedScores.problemSolving * 0.25 +
            result.adjustedScores.codeQuality * 0.25 +
            result.adjustedScores.communication * 0.2
        )

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
  }
): Promise<FeedbackCritiqueAdjustment> {
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
   - Red flags: Praising "optimal complexity" when pass rate is low, claiming "explained well" when communication=30

4. ACTIONABILITY: Does feedback give clear next steps?
   - Can the student understand what to improve?
   - Are suggestions specific and concrete?
   - Red flags: Vague advice like "do better" or "study more" without specifics

CRITICAL RULES:
- Only flag SEVERE violations (be conservative)
- Suggest rewrites ONLY if feedback is harmful/misleading
- If feedback is reasonable, return empty critiques
- Focus on: overly harsh tone, factual errors, unclear guidance

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
    // Use a DIFFERENT provider than the main scoring to ensure independent critique
    // Main scoring uses Gemini, so use Deepseek here for true Constitutional AI
    // Deepseek is excellent at reasoning/critique tasks and much cheaper than Claude
    const response = await generateAIResponse(
      "You are a Constitutional AI reviewer. Return only valid JSON, no markdown.",
      critiquePrompt,
      [],
      {
        complexity: "simple",
        temperature: 0.2,
        preferredProvider: "deepseek", // IMPORTANT: Different provider for true Constitutional AI (cheaper than Claude)
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
