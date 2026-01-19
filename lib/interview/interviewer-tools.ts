/**
 * Interviewer Tools - Function Calling for AI Interviewer
 *
 * These tools let the AI interviewer query state instead of reading it from prompts.
 * This is more reliable because:
 * 1. AI explicitly calls a function to get state (can't ignore it)
 * 2. State is always current (not stale from prompt construction)
 * 3. Tool results are structured (not buried in text)
 *
 * Compatible with Claude's tool_use and OpenAI's function_calling.
 * DRY: Uses shared-patterns.ts for all detection patterns.
 */

import type { ConversationTracker } from "./interview-phases"
import { VAGUE_ANSWER_PATTERNS, COMPLEXITY_PATTERNS, EDGE_CASE_KEYWORDS } from "./shared-patterns"

// =============================================================================
// TOOL DEFINITIONS (for LLM)
// =============================================================================

export interface ToolDefinition {
  name: string
  description: string
  input_schema: {
    type: "object"
    properties: Record<string, { type: string; description: string }>
    required: string[]
  }
}

export const INTERVIEWER_TOOLS: ToolDefinition[] = [
  {
    name: "check_prerequisites",
    description:
      "Check if the candidate has covered required topics before transitioning to coding. Call this BEFORE saying 'code it up' or 'go ahead and code'.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_next_required_topic",
    description:
      "Get the next topic that must be discussed before coding can begin. Returns null if all prerequisites are met.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "check_already_discussed",
    description:
      "Check if a specific topic has already been discussed to avoid asking about it again.",
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "The topic to check: 'complexity', 'edge_cases', 'approach', or 'alternatives'",
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "get_interview_phase",
    description: "Get the current phase of the interview to determine appropriate behavior.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "analyze_user_response",
    description:
      "Analyze the user's last message to determine if it was vague, specific, or a question.",
    input_schema: {
      type: "object",
      properties: {
        user_message: {
          type: "string",
          description: "The user's message to analyze",
        },
      },
      required: ["user_message"],
    },
  },
]

// =============================================================================
// TOOL CONTEXT (state passed to tool execution)
// =============================================================================

export interface ToolContext {
  tracker: ConversationTracker | undefined
  phase: string
  isOptimalSolution: boolean
  testsHaveRun: boolean
  testsPassed: number
  testsTotal: number
}

// =============================================================================
// TOOL EXECUTION
// =============================================================================

export interface ToolResult {
  success: boolean
  data: Record<string, unknown>
}

/**
 * Execute a tool and return the result
 */
export function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): ToolResult {
  switch (toolName) {
    case "check_prerequisites":
      return executeCheckPrerequisites(ctx)
    case "get_next_required_topic":
      return executeGetNextRequiredTopic(ctx)
    case "check_already_discussed":
      return executeCheckAlreadyDiscussed(args.topic as string, ctx)
    case "get_interview_phase":
      return executeGetInterviewPhase(ctx)
    case "analyze_user_response":
      return executeAnalyzeUserResponse(args.user_message as string, ctx)
    default:
      return { success: false, data: { error: `Unknown tool: ${toolName}` } }
  }
}

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

function executeCheckPrerequisites(ctx: ToolContext): ToolResult {
  const tracker = ctx.tracker

  const complexityDiscussed = tracker?.timeComplexityMentioned ?? false
  const edgeCasesDiscussed = (tracker?.edgeCasesMentioned?.length ?? 0) > 0
  const approachExplained = tracker?.approachExplained ?? false

  const canTransitionToCoding = complexityDiscussed && edgeCasesDiscussed

  const missing: string[] = []
  if (!complexityDiscussed) missing.push("time/space complexity")
  if (!edgeCasesDiscussed) missing.push("edge cases")

  return {
    success: true,
    data: {
      canTransitionToCoding,
      complexityDiscussed,
      edgeCasesDiscussed,
      approachExplained,
      missing,
      instruction: canTransitionToCoding
        ? "Prerequisites met. You may tell them to start coding."
        : `DO NOT say 'code it up' yet. First ask about: ${missing.join(", ")}`,
    },
  }
}

function executeGetNextRequiredTopic(ctx: ToolContext): ToolResult {
  const tracker = ctx.tracker

  // Priority order for discussion
  if (!tracker?.approachExplained) {
    return {
      success: true,
      data: {
        topic: "approach",
        question: "What approach are you thinking of using?",
        reason: "Candidate hasn't explained their approach yet",
      },
    }
  }

  if (!tracker?.timeComplexityMentioned) {
    return {
      success: true,
      data: {
        topic: "complexity",
        question: "What time and space complexity are you targeting?",
        reason: "Complexity hasn't been discussed yet",
      },
    }
  }

  if ((tracker?.edgeCasesMentioned?.length ?? 0) === 0) {
    return {
      success: true,
      data: {
        topic: "edge_cases",
        question: "What edge cases are you thinking about?",
        reason: "No edge cases have been discussed yet",
      },
    }
  }

  return {
    success: true,
    data: {
      topic: null,
      question: null,
      reason: "All prerequisites covered. Ready to code.",
    },
  }
}

function executeCheckAlreadyDiscussed(topic: string, ctx: ToolContext): ToolResult {
  const tracker = ctx.tracker

  switch (topic) {
    case "complexity":
      return {
        success: true,
        data: {
          discussed: tracker?.timeComplexityMentioned ?? false,
          value: tracker?.timeComplexityValue,
          instruction: tracker?.timeComplexityMentioned
            ? `Complexity already discussed (${tracker.timeComplexityValue}). Don't ask again.`
            : "Complexity NOT yet discussed. You should ask about it.",
        },
      }

    case "edge_cases":
      const edgeCases = tracker?.edgeCasesMentioned ?? []
      return {
        success: true,
        data: {
          discussed: edgeCases.length > 0,
          cases: edgeCases,
          instruction:
            edgeCases.length > 0
              ? `Edge cases already discussed: ${edgeCases.join(", ")}. Ask about different ones or move on.`
              : "Edge cases NOT yet discussed. You should ask about them.",
        },
      }

    case "approach":
      return {
        success: true,
        data: {
          discussed: tracker?.approachExplained ?? false,
          type: tracker?.approachType,
          instruction: tracker?.approachExplained
            ? `Approach already explained (${tracker.approachType}). Don't ask again.`
            : "Approach NOT yet explained. Ask them to walk through their plan.",
        },
      }

    case "alternatives":
      return {
        success: true,
        data: {
          discussed: tracker?.alternativesDiscussed ?? false,
          instruction: tracker?.alternativesDiscussed
            ? "Alternatives already discussed. Move on."
            : "Alternatives NOT discussed. You could ask about other approaches.",
        },
      }

    default:
      return {
        success: false,
        data: {
          error: `Unknown topic: ${topic}. Use: complexity, edge_cases, approach, or alternatives`,
        },
      }
  }
}

function executeGetInterviewPhase(ctx: ToolContext): ToolResult {
  const phaseGuidance: Record<string, string> = {
    intro: "Keep it brief. Ask them to study the problem and share their initial thoughts.",
    discussion: "Focus on approach, complexity, and edge cases BEFORE coding.",
    coding: "Let them code. Only interrupt for clarifying questions or if they're stuck.",
    testing: "Tests have run. Discuss results, complexity, and potential improvements.",
    post_interview: "Interview complete. Guide them to submit for feedback.",
  }

  return {
    success: true,
    data: {
      phase: ctx.phase,
      testsHaveRun: ctx.testsHaveRun,
      testResults: ctx.testsHaveRun
        ? {
            passed: ctx.testsPassed,
            total: ctx.testsTotal,
            allPassed: ctx.testsPassed === ctx.testsTotal,
          }
        : null,
      isOptimalSolution: ctx.isOptimalSolution,
      guidance: phaseGuidance[ctx.phase] || "Continue the interview naturally.",
    },
  }
}

function executeAnalyzeUserResponse(userMessage: string, ctx: ToolContext): ToolResult {
  const lower = userMessage.toLowerCase()
  const length = userMessage.length

  // Check for questions
  const isQuestion = userMessage.includes("?")

  // Check for vague statements - use shared patterns
  const isVague = length < 100 && VAGUE_ANSWER_PATTERNS.some((p) => p.test(userMessage))

  // Check for complexity mentions - use shared patterns
  const mentionsComplexity =
    COMPLEXITY_PATTERNS.bigO.test(userMessage) ||
    /linear|quadratic|n\s*log\s*n|n\s*squared|constant|logarithmic/i.test(userMessage)

  // Check for edge case mentions - use shared keywords
  const mentionsEdgeCases = EDGE_CASE_KEYWORDS.some((keyword) => lower.includes(keyword))

  // Check for approach explanation
  const explainsApproach =
    length > 100 &&
    (/i(?:'ll| will| would| can) (?:use|try|start|do)/i.test(lower) ||
      /my (?:approach|plan|idea|thought)/i.test(lower) ||
      /first.*then|step.*step/i.test(lower))

  return {
    success: true,
    data: {
      isQuestion,
      isVague,
      mentionsComplexity,
      mentionsEdgeCases,
      explainsApproach,
      length,
      instruction: isVague
        ? "User gave a vague answer. Probe for specifics: 'How exactly would you do that?'"
        : isQuestion
          ? "User asked a question. Answer it briefly, then redirect to the interview."
          : "User gave a substantive response. Acknowledge and continue.",
    },
  }
}

// =============================================================================
// TOOL RESULT FORMATTING (for injection into conversation)
// =============================================================================

/**
 * Format tool results for injection into the AI's context
 * Phase tool result is formatted prominently to ensure AI awareness
 */
export function formatToolResultsForPrompt(
  toolCalls: Array<{ name: string; result: ToolResult }>
): string {
  if (toolCalls.length === 0) return ""

  // Separate phase tool from other tools for prominence
  const phaseTool = toolCalls.find((tc) => tc.name === "get_interview_phase")
  const otherTools = toolCalls.filter((tc) => tc.name !== "get_interview_phase")

  let formatted = ""

  // Phase tool gets prominent formatting at the top
  if (phaseTool) {
    const phaseData = phaseTool.result.data
    formatted += `
═══════════════════════════════════════════════════════════════
🔍 TOOL CALL: get_interview_phase (REQUIRED - YOU MUST USE THIS)
═══════════════════════════════════════════════════════════════
CURRENT PHASE: ${phaseData.phase}
${phaseData.guidance ? `GUIDANCE: ${phaseData.guidance}` : ""}
${phaseData.testsHaveRun ? `TEST STATUS: ${phaseData.testResults?.passed}/${phaseData.testResults?.total} passed` : ""}
${phaseData.isOptimalSolution ? "SOLUTION STATUS: Optimal solution detected" : ""}

⚠️ CRITICAL: Your response MUST be appropriate for the ${phaseData.phase} phase.
Review the guidance above and ensure your response matches this phase.
═══════════════════════════════════════════════════════════════

`
  }

  // Other tools formatted normally
  if (otherTools.length > 0) {
    const otherFormatted = otherTools
      .map(({ name, result }) => {
        return `[Tool: ${name}]\n${JSON.stringify(result.data, null, 2)}`
      })
      .join("\n\n")

    formatted += `
=== OTHER TOOL RESULTS ===
${otherFormatted}
==========================
`
  }

  return formatted
}
