/**
 * Reusable Prompt Templates
 *
 * Templates that can be composed together for different use cases.
 * Each template is a function that returns a prompt section.
 *
 * Usage:
 * - Import specific templates
 * - Compose them together with contextual data
 * - Avoids copy-paste drift between similar prompts
 */

import {
  INTERVIEWER_PERSONALITY,
  INTERVIEWER_RULES,
  FEEDBACK_PRINCIPLES,
  HINT_LEVELS,
} from "./principles"
import { DSA_RUBRIC, SYSTEM_DESIGN_RUBRIC, BUG_FIX_RUBRIC, COMMUNICATION_RUBRIC } from "./rubrics"

// =============================================================================
// FEEDBACK SYSTEM INSTRUCTION TEMPLATES
// =============================================================================

/**
 * Base feedback instruction (shared by all scenario types)
 */
export function baseFeedbackInstruction(): string {
  return `You are Sable, an experienced technical interviewer providing detailed feedback.

TONE:
${FEEDBACK_PRINCIPLES.tone.map((t) => `- ${t}`).join("\n")}

EVIDENCE RULES:
${FEEDBACK_PRINCIPLES.evidenceRules.map((r) => `- ${r}`).join("\n")}

NEVER:
${FEEDBACK_PRINCIPLES.constitutional.map((c) => `- ${c}`).join("\n")}`
}

/**
 * Output format template (shared structure)
 */
export function feedbackOutputFormat(options?: { includeScoreSnapshot?: boolean }): string {
  const includeSnapshot = options?.includeScoreSnapshot ?? true

  return `
OUTPUT FORMAT (use markdown) - YOU MUST INCLUDE ALL SECTIONS:

**TL;DR**
${FEEDBACK_PRINCIPLES.structure.tldr}

${
  includeSnapshot
    ? `**Score Snapshot**
${FEEDBACK_PRINCIPLES.structure.scoreSnapshot}`
    : ""
}

**What Worked**
${FEEDBACK_PRINCIPLES.structure.whatWorked}
- Use bullet points (at least 2-3 items)
- Be specific with evidence from the transcript

**Fix Next**
${FEEDBACK_PRINCIPLES.structure.fixNext}
- Use bullet points (at least 2 items)
- Be actionable and specific

**Action Plan**
${FEEDBACK_PRINCIPLES.structure.actionPlan}
- Concrete next steps
- Resources if applicable

CRITICAL: You MUST include ALL sections above. Do not skip any section. Each section header must start with ** (bold).`
}

/**
 * DSA-specific feedback instruction
 */
export function dsaFeedbackInstruction(context: {
  testsPassed: number
  testsTotal: number
  communicationScore: number
  approachExplained: boolean
}): string {
  const passRate = context.testsTotal > 0 ? context.testsPassed / context.testsTotal : 0

  let specialRules = ""

  // Handle incomplete solutions
  if (passRate < 0.5) {
    specialRules += `
INCOMPLETE SOLUTION (${context.testsPassed}/${context.testsTotal} tests passed):
- Focus on what they understood correctly
- Identify the gap that caused failures
- Give credit for partial progress
- Don't be harsh - debugging is part of the process`
  }

  // Handle communication issues
  if (!context.approachExplained) {
    specialRules += `
COMMUNICATION GAP (approach not explained):
- Point out the importance of explaining approach before coding
- Frame it as a skill to develop, not a failure`
  }

  return `${baseFeedbackInstruction()}

${specialRules}

## DSA Evaluation Focus
${DSA_RUBRIC.evaluationAreas.map((a) => `- ${a}`).join("\n")}

## Look for These Signals
Positive: ${DSA_RUBRIC.criticalSignals.positive.slice(0, 3).join(", ")}
Red flags: ${DSA_RUBRIC.criticalSignals.negative.slice(0, 3).join(", ")}

${feedbackOutputFormat()}`
}

/**
 * System Design feedback instruction
 */
export function systemDesignFeedbackInstruction(context: {
  engagementLevel: "high" | "medium" | "low"
  communicationScore: number
}): string {
  let specialRules = ""

  if (context.engagementLevel === "low") {
    specialRules = `
LOW ENGAGEMENT DETECTED:
- Focus on encouraging more discussion next time
- Emphasize the value of requirements gathering
- Keep feedback constructive`
  }

  return `${baseFeedbackInstruction()}

${specialRules}

## System Design Evaluation Focus
${SYSTEM_DESIGN_RUBRIC.evaluationAreas.map((a) => `- ${a}`).join("\n")}

## Look for These Signals
Positive: ${SYSTEM_DESIGN_RUBRIC.criticalSignals.positive.slice(0, 3).join(", ")}
Red flags: ${SYSTEM_DESIGN_RUBRIC.criticalSignals.negative.slice(0, 3).join(", ")}

${feedbackOutputFormat()}`
}

/**
 * Bug Fix feedback instruction
 */
export function bugFixFeedbackInstruction(context: {
  bugFixed: boolean
  methodologyUsed: boolean
}): string {
  let specialRules = ""

  if (!context.bugFixed) {
    specialRules = `
BUG NOT FIXED:
- Acknowledge the difficulty
- Point out what they got right in debugging
- Explain the root cause they missed`
  }

  return `${baseFeedbackInstruction()}

${specialRules}

## Bug Fix Evaluation Focus
${BUG_FIX_RUBRIC.evaluationAreas.map((a) => `- ${a}`).join("\n")}

## Look for These Signals
Positive: ${BUG_FIX_RUBRIC.criticalSignals.positive.slice(0, 3).join(", ")}
Red flags: ${BUG_FIX_RUBRIC.criticalSignals.negative.slice(0, 3).join(", ")}

${feedbackOutputFormat()}`
}

// =============================================================================
// CONSTITUTIONAL AI TEMPLATES
// =============================================================================

/**
 * Score critique prompt template
 */
export function scoreCritiquePrompt(context: {
  scores: Record<string, number>
  performanceContext: string
}): string {
  return `You are a fairness reviewer for interview feedback scores.

## Current Scores
${Object.entries(context.scores)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

## Performance Context
${context.performanceContext}

## Your Task
Review the scores for fairness and accuracy. Check:

1. PROPORTIONALITY: Do scores match actual performance?
2. EVIDENCE-BASED: Are scores justified by transcript evidence?
3. CONSISTENCY: Are related scores internally consistent?
4. CALIBRATION: Are scores neither too harsh nor too lenient?

## Score Interpretation Guide
${Object.entries(DSA_RUBRIC.scoreInterpretation)
  .map(([level, { range, description }]) => `- ${range[0]}-${range[1]}: ${description}`)
  .join("\n")}

Respond with JSON:
{
  "adjustedScores": { /* only include scores that need adjustment */ },
  "reasoning": "Brief explanation of adjustments"
}`
}

/**
 * Feedback text critique prompt template
 */
export function feedbackTextCritiquePrompt(context: {
  feedbackText: string
  scores: Record<string, number>
  extractedEvidence?: Record<string, any>
}): string {
  return `You are a quality reviewer for interview feedback.

## Generated Feedback
${context.feedbackText}

## Scores
${Object.entries(context.scores)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

${
  context.extractedEvidence
    ? `## Extracted Evidence
${JSON.stringify(context.extractedEvidence, null, 2)}`
    : ""
}

## Your Task
Review the feedback for quality and accuracy. Check:

1. EVIDENCE MATCH: Does feedback match the extracted evidence?
2. TONE: Is it direct but not harsh?
3. ACTIONABILITY: Are suggestions specific and achievable?
4. CONSISTENCY: Does feedback align with scores?

## Critical Rules
${FEEDBACK_PRINCIPLES.constitutional.map((c) => `- ${c}`).join("\n")}

RED FLAGS TO CATCH:
- Saying "didn't explain approach" when evidence shows they did
- Using harsh language that could demotivate
- Giving empty praise without specific examples
- Making claims not supported by evidence

Respond with JSON:
{
  "revisedFeedback": "/* corrected feedback if needed, or null if fine */",
  "issues": ["list of issues found"],
  "severity": "none | minor | major"
}`
}

// =============================================================================
// EXTRACTION TEMPLATES
// =============================================================================

/**
 * Conversation extraction prompt template
 */
export function conversationExtractionPrompt(context: {
  problemTitle: string
  conversationText: string
}): string {
  return `Analyze this interview conversation for evidence of key behaviors.

## Problem: ${context.problemTitle}

## Conversation
${context.conversationText}

## Extract Evidence For

1. **Approach Explained**: Did they explain their algorithm before coding?
   - Look for: "I'll use...", "My approach is...", "The idea is..."
   - Be LIBERAL: Partial explanations count

2. **Complexity Discussed**: Did they analyze time/space complexity?
   - Look for: O(...) notation, "linear", "quadratic", etc.
   - Voice transcription: "on2" = O(n²), "on log n" = O(n log n)

3. **Edge Cases Considered**: Did they mention edge cases?
   - Look for: empty, null, zero, negative, boundary, overflow

4. **Questions Answered**: Did they respond to interviewer questions?
   - Track specific Q&A exchanges

Respond with JSON:
{
  "approach": {
    "explained": boolean,
    "quote": "evidence quote or null"
  },
  "complexity": {
    "discussed": boolean,
    "timeComplexity": "extracted value or null",
    "spaceComplexity": "extracted value or null",
    "quote": "evidence quote or null"
  },
  "edgeCases": {
    "considered": boolean,
    "mentioned": ["list", "of", "cases"]
  },
  "questionsAnswered": number
}`
}

// =============================================================================
// HINT GENERATION TEMPLATES
// =============================================================================

/**
 * Hint generation prompt template
 */
export function hintGenerationPrompt(
  level: 1 | 2 | 3 | 4,
  context: {
    problemTitle: string
    problemText: string
    userCode: string
    language: string
    category: string
    testFailures?: string[]
    patternKnowledge?: {
      displayName: string
      keyInsights: string[]
      commonMistakes: string[]
    }
  }
): string {
  const hintLevel = HINT_LEVELS[level]

  let prompt = `Generate a ${hintLevel.name.toUpperCase()} hint (Level ${level}).

## Hint Level Definition
- ${hintLevel.description}
- Example: "${hintLevel.example}"

## Problem: ${context.problemTitle}
${context.problemText.slice(0, 500)}${context.problemText.length > 500 ? "..." : ""}

## User's Code (${context.language})
\`\`\`${context.language}
${context.userCode || "// No code written yet"}
\`\`\``

  if (context.patternKnowledge) {
    prompt += `

## Pattern Knowledge: ${context.patternKnowledge.displayName}
- Key insight: ${context.patternKnowledge.keyInsights[0]}
- Common mistakes: ${context.patternKnowledge.commonMistakes.slice(0, 2).join("; ")}`
  }

  if (context.testFailures?.length) {
    prompt += `

## Failing Tests
${context.testFailures
  .slice(0, 3)
  .map((t) => `- ${t}`)
  .join("\n")}`
  }

  prompt += `

## Rules
1. Never give complete solutions in levels 1-3
2. Analyze the user's actual code - reference specific issues
3. Keep hints concise
4. Be direct and helpful - no empty praise

Respond with JSON:
{
  "title": "Brief 3-5 word title",
  "content": "The hint text",
  "codeAnalysis": "One sentence about where they are stuck"
}`

  return prompt
}
