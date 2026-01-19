/**
 * Feedback Writer Agent - Generates structured feedback from scores and evidence
 *
 * Single Responsibility: Generate human-readable feedback grounded in evidence.
 * Uses smart model for narrative generation.
 *
 * Model: Smart (Claude/Gemini) - Requires quality writing
 */

import type { Agent, AgentConfig, FeedbackWriterInput, FeedbackWriterOutput } from "./types"
import type { ScoreResult } from "@/lib/feedback/types"
import type { ExtractedEvidence } from "@/lib/feedback/structured-extraction"
import { generateAIResponse } from "@/lib/ai-providers"
import { logger } from "@/lib/logger"
// RAG Knowledge imports for enriched feedback
import { getPatternKnowledge } from "@/lib/rag/knowledge-base/dsa-knowledge"
import type { DSAPattern } from "@/lib/types/dsa-patterns"

// =============================================================================
// TYPES
// =============================================================================

export interface FeedbackWriterAgentInput {
  // Scenario info
  scenarioType: "dsa" | "system-design" | "bugfix"
  scenarioTitle: string
  scenarioPattern?: string // For pattern-specific tips

  // Scores (from ScorerAgent)
  scores: ScoreResult

  // Evidence (from extraction)
  evidence: ExtractedEvidence

  // Additional context
  testsPassed: number
  testsTotal: number
  code: string
  optimalComplexity?: string

  // User context
  userName?: string
  skillLevel?: string
}

export interface FeedbackWriterAgentOutput {
  // Structured sections
  tldr: string
  whatWorked: string[]
  fixNext: string[]
  actionPlan: string[]

  // Detailed feedback by category
  detailedFeedback: {
    understanding: string
    problemSolving: string
    codeQuality: string
    communication: string
  }

  // Pattern-specific insights (from RAG knowledge)
  patternInsight?: {
    patternName: string
    keyTakeaway: string
    commonMistake?: string
  }

  // Full narrative
  rawFeedback: string
}

// =============================================================================
// FEEDBACK WRITER AGENT
// =============================================================================

export class FeedbackWriterAgent implements Agent<
  FeedbackWriterAgentInput,
  FeedbackWriterAgentOutput
> {
  readonly config: AgentConfig = {
    type: "feedback_writer",
    modelTier: "smart", // Needs quality writing
    description: "Generates structured feedback from scores and evidence",
    maxRetries: 2,
  }

  async execute(input: FeedbackWriterAgentInput): Promise<FeedbackWriterAgentOutput> {
    const startTime = Date.now()

    logger.info("[FeedbackWriterAgent] Generating feedback", {
      scenarioType: input.scenarioType,
      overall: input.scores.overall,
      scenarioPattern: input.scenarioPattern,
    })

    try {
      // Build the prompt with evidence grounding + pattern knowledge
      const prompt = this.buildFeedbackPrompt(input)

      // Generate feedback using AI with timeout to prevent hanging
      const FEEDBACK_TIMEOUT_MS = 45000 // 45 seconds
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Feedback generation timed out after 45 seconds")),
          FEEDBACK_TIMEOUT_MS
        )
      )

      const response = await Promise.race([
        generateAIResponse(this.buildSystemPrompt(input), prompt, [], {
          complexity: "complex",
          temperature: 0.3, // Low temperature for consistent feedback
        }),
        timeoutPromise,
      ])

      // Parse the structured response
      const parsed = this.parseFeedbackResponse(response.text, input)

      // Enrich with pattern knowledge (from RAG)
      const patternInsight = this.buildPatternInsight(input.scenarioPattern)

      const latency = Date.now() - startTime
      logger.info("[FeedbackWriterAgent] Feedback generated", {
        latencyMs: latency,
        whatWorkedCount: parsed.whatWorked.length,
        fixNextCount: parsed.fixNext.length,
        hasPatternInsight: !!patternInsight,
      })

      return {
        ...parsed,
        patternInsight,
      }
    } catch (error) {
      const latency = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      logger.error("[FeedbackWriterAgent] Feedback generation failed, using fallback", {
        error: errorMessage,
        latencyMs: latency,
        scenarioType: input.scenarioType,
        overall: input.scores.overall,
      })

      // Return fallback feedback based on scores
      return this.generateFallbackFeedback(input)
    }
  }

  /**
   * Generate fallback feedback when AI call fails
   * Uses scores to construct basic feedback without AI
   */
  private generateFallbackFeedback(input: FeedbackWriterAgentInput): FeedbackWriterAgentOutput {
    const { scores, scenarioTitle } = input
    const passRate =
      input.testsTotal > 0 ? Math.round((input.testsPassed / input.testsTotal) * 100) : 0

    // Generate TL;DR based on overall score
    const tldr = this.generateDefaultTldr(input)

    // Generate what worked based on scores
    const whatWorked: string[] = []
    if (passRate >= 80) whatWorked.push("Strong test case coverage")
    if (scores.understanding >= 60) whatWorked.push("Good problem understanding")
    if (scores.codeQuality >= 70) whatWorked.push("Clean, maintainable code")
    if (scores.communication >= 50) whatWorked.push("Communicated approach effectively")
    if (whatWorked.length === 0) whatWorked.push("Attempted the problem")

    // Generate fix next based on lower scores
    const fixNext: string[] = []
    if (passRate < 100) fixNext.push("Review failing test cases and edge cases")
    if (scores.understanding < 60) fixNext.push("Practice explaining your approach more clearly")
    if (scores.codeQuality < 60) fixNext.push("Focus on code cleanliness and readability")
    if (scores.communication < 40) fixNext.push("Work on thinking out loud while coding")
    if (fixNext.length === 0) fixNext.push("Keep practicing to maintain your skills")

    // Generate action plan
    const actionPlan = [
      `Review the ${scenarioTitle} problem pattern`,
      "Practice similar problems to reinforce concepts",
    ]

    // Generate detailed feedback sections
    const detailedFeedback = {
      understanding:
        scores.understanding >= 60
          ? "You demonstrated a solid understanding of the problem requirements."
          : "Consider spending more time analyzing the problem before coding.",
      problemSolving:
        scores.problemSolving >= 60
          ? "Your problem-solving approach was methodical."
          : "Try breaking down the problem into smaller steps.",
      codeQuality:
        scores.codeQuality >= 60
          ? "Your code was well-structured and readable."
          : "Focus on writing cleaner, more maintainable code.",
      communication:
        scores.communication >= 50
          ? "You communicated your thought process effectively."
          : "Practice explaining your reasoning while coding.",
    }

    const patternInsight = this.buildPatternInsight(input.scenarioPattern)

    // Build raw feedback text
    const rawFeedback = `## TL;DR
${tldr}

## What Worked
${whatWorked.map((w) => `- ${w}`).join("\n")}

## Fix Next
${fixNext.map((f) => `- ${f}`).join("\n")}

## Action Plan
${actionPlan.map((a, i) => `${i + 1}. ${a}`).join("\n")}

## Detailed Feedback

### Understanding
${detailedFeedback.understanding}

### Problem-Solving
${detailedFeedback.problemSolving}

### Code Quality
${detailedFeedback.codeQuality}

### Communication
${detailedFeedback.communication}`

    return {
      tldr,
      whatWorked,
      fixNext,
      actionPlan,
      detailedFeedback,
      rawFeedback,
      patternInsight,
    }
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private buildSystemPrompt(input: FeedbackWriterAgentInput): string {
    const passRate =
      input.testsTotal > 0 ? Math.round((input.testsPassed / input.testsTotal) * 100) : 0

    return `You are a senior technical interviewer providing feedback after a coding interview.

SCORING CONTEXT:
- Overall Score: ${input.scores.overall}/100
- Understanding: ${input.scores.understanding}/100
- Problem-Solving: ${input.scores.problemSolving}/100
- Code Quality: ${input.scores.codeQuality}/100
- Communication: ${input.scores.communication}/100
- Test Pass Rate: ${passRate}%

FEEDBACK PRINCIPLES:
1. Be SPECIFIC - reference actual quotes and behaviors from the interview
2. Be CONSTRUCTIVE - focus on improvement, not criticism
3. Be GROUNDED - only mention things that actually happened (use evidence)
4. Be ACTIONABLE - give concrete next steps
5. Be HONEST - don't inflate or deflate performance

TONE:
- Direct but encouraging
- Professional, like a mentor
- Use "you" not "the candidate"
- Casual language is fine ("Nice work on...", "One thing to work on...")

OUTPUT FORMAT (use exactly these headers):
## TL;DR
One sentence summary of performance.

## What Worked
- Bullet points of specific things done well (with evidence)

## Fix Next
- Top 2-3 specific improvements needed

## Action Plan
- Concrete practice recommendations

## Detailed Feedback

### Understanding
Paragraph about approach explanation and problem understanding.

### Problem-Solving
Paragraph about debugging, optimization, edge cases.

### Code Quality
Paragraph about code cleanliness and correctness.

### Communication
Paragraph about thinking out loud and responding to questions.`
  }

  private buildFeedbackPrompt(input: FeedbackWriterAgentInput): string {
    const evidence = input.evidence
    const evidenceSummary = this.buildEvidenceSummary(evidence)
    const patternContext = this.buildPatternContext(input.scenarioPattern)

    return `Generate feedback for this ${input.scenarioType.toUpperCase()} interview on "${input.scenarioTitle}".

EXTRACTED EVIDENCE (ground your feedback in this):
${evidenceSummary}
${patternContext}
IMPORTANT GROUNDING RULES:
- Only mention edge cases if evidence shows they discussed them
- Only praise complexity analysis if evidence shows they got it right
- Only mention "good communication" if evidence shows they explained while coding
- If evidence shows they were silent, mention that in communication feedback
- If pattern knowledge is provided, reference specific pattern insights in your feedback

Generate structured feedback following the format specified.`
  }

  /**
   * Build pattern context for the AI prompt
   */
  private buildPatternContext(scenarioPattern?: string): string {
    if (!scenarioPattern) return ""

    const patternKnowledge = getPatternKnowledge(scenarioPattern as DSAPattern)
    if (!patternKnowledge) return ""

    return `
PATTERN KNOWLEDGE (use this to give pattern-specific feedback):
- Pattern: ${patternKnowledge.displayName}
- Key Insight: ${patternKnowledge.keyInsights[0] || "N/A"}
- Common Mistake: ${patternKnowledge.commonMistakes[0] || "N/A"}
- Expected Time: ${patternKnowledge.timeComplexity.typical}
- Expected Space: ${patternKnowledge.spaceComplexity.typical}
`
  }

  private buildEvidenceSummary(evidence: ExtractedEvidence): string {
    const parts: string[] = []

    // Approach
    if (evidence.approach.explained) {
      parts.push(`APPROACH: ${evidence.approach.type}`)
      if (evidence.approach.quote) {
        parts.push(`  Quote: "${evidence.approach.quote}"`)
      }
    } else {
      parts.push("APPROACH: Not clearly explained")
    }

    // Complexity
    if (evidence.timeComplexity.mentioned) {
      const correct = evidence.timeComplexity.isCorrect ? "✓ correct" : "✗ incorrect"
      parts.push(`TIME COMPLEXITY: ${evidence.timeComplexity.value} (${correct})`)
      if (evidence.timeComplexity.quote) {
        parts.push(`  Quote: "${evidence.timeComplexity.quote}"`)
      }
    } else {
      parts.push("TIME COMPLEXITY: Not discussed")
    }

    if (evidence.spaceComplexity.mentioned) {
      parts.push(`SPACE COMPLEXITY: ${evidence.spaceComplexity.value}`)
    }

    // Edge cases
    if (evidence.edgeCases.mentionedByCandidate.length > 0) {
      parts.push(`EDGE CASES MENTIONED: ${evidence.edgeCases.mentionedByCandidate.join(", ")}`)
    }
    if (evidence.edgeCases.missedCritical.length > 0) {
      parts.push(`EDGE CASES MISSED: ${evidence.edgeCases.missedCritical.join(", ")}`)
    }

    // Progression
    if (evidence.progression.improvedAfterPrompt) {
      parts.push("PROGRESSION: Improved approach after feedback ✓")
    }
    if (evidence.progression.selfCorrectedBugs) {
      parts.push("DEBUGGING: Self-corrected bugs ✓")
    }

    // Communication
    if (evidence.communication.explainedWhileCoding) {
      parts.push("COMMUNICATION: Explained while coding ✓")
    } else {
      parts.push("COMMUNICATION: Did not explain while coding")
    }
    if (evidence.communication.askedClarifyingQuestions) {
      parts.push("CLARIFYING QUESTIONS: Asked good questions ✓")
    }

    // Hints
    if (evidence.hints.totalGiven > 0) {
      const usage = evidence.hints.usedEffectively ? "used effectively" : "not used effectively"
      parts.push(`HINTS: ${evidence.hints.totalGiven} given, ${usage}`)
    }

    return parts.join("\n")
  }

  private parseFeedbackResponse(
    response: string,
    input: FeedbackWriterAgentInput
  ): FeedbackWriterAgentOutput {
    // Parse TL;DR
    const tldrMatch = response.match(/## TL;DR\s*\n([^\n#]+)/i)
    const tldr = tldrMatch?.[1]?.trim() || this.generateDefaultTldr(input)

    // Parse What Worked
    const whatWorkedMatch = response.match(/## What Worked\s*\n([\s\S]*?)(?=\n## |$)/i)
    const whatWorked = this.parseBulletPoints(whatWorkedMatch?.[1] || "")

    // Parse Fix Next
    const fixNextMatch = response.match(/## Fix Next\s*\n([\s\S]*?)(?=\n## |$)/i)
    const fixNext = this.parseBulletPoints(fixNextMatch?.[1] || "")

    // Parse Action Plan
    const actionPlanMatch = response.match(/## Action Plan\s*\n([\s\S]*?)(?=\n## |$)/i)
    const actionPlan = this.parseBulletPoints(actionPlanMatch?.[1] || "")

    // Parse Detailed Feedback
    const detailedFeedback = {
      understanding: this.parseSection(response, "Understanding"),
      problemSolving: this.parseSection(response, "Problem-Solving"),
      codeQuality: this.parseSection(response, "Code Quality"),
      communication: this.parseSection(response, "Communication"),
    }

    return {
      tldr,
      whatWorked: whatWorked.length > 0 ? whatWorked : ["Attempted the problem"],
      fixNext: fixNext.length > 0 ? fixNext : ["Practice similar problems"],
      actionPlan: actionPlan.length > 0 ? actionPlan : ["Review this problem type"],
      detailedFeedback,
      rawFeedback: response,
    }
  }

  private parseBulletPoints(text: string): string[] {
    if (!text) return []

    return text
      .split("\n")
      .map((line) => line.replace(/^[-*•]\s*/, "").trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
  }

  private parseSection(response: string, sectionName: string): string {
    const pattern = new RegExp(`### ${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n### |\\n## |$)`, "i")
    const match = response.match(pattern)
    return match?.[1]?.trim() || `No specific feedback for ${sectionName.toLowerCase()}.`
  }

  private generateDefaultTldr(input: FeedbackWriterAgentInput): string {
    const { scores } = input
    if (scores.overall >= 80) {
      return "Strong performance! You demonstrated good problem-solving and communication skills."
    } else if (scores.overall >= 60) {
      return "Solid attempt with room for improvement in a few areas."
    } else if (scores.overall >= 40) {
      return "Keep practicing - focus on explaining your approach and considering edge cases."
    } else {
      return "This problem type needs more practice. Review the fundamentals and try again."
    }
  }

  /**
   * Build pattern-specific insight from RAG knowledge
   */
  private buildPatternInsight(
    scenarioPattern?: string
  ): FeedbackWriterAgentOutput["patternInsight"] {
    if (!scenarioPattern) return undefined

    const patternKnowledge = getPatternKnowledge(scenarioPattern as DSAPattern)
    if (!patternKnowledge) return undefined

    return {
      patternName: patternKnowledge.displayName,
      keyTakeaway: patternKnowledge.keyInsights[0] || patternKnowledge.description,
      commonMistake: patternKnowledge.commonMistakes[0],
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createFeedbackWriterAgent(): FeedbackWriterAgent {
  return new FeedbackWriterAgent()
}
