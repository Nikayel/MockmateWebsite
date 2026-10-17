import {
  executeTool,
  formatToolResultsForPrompt,
  type ToolContext,
} from "@/lib/interview/interviewer-tools"
import type { ChatRequestContext } from "./request-context"
import type { ChatInterviewState } from "./interview-state"

export function buildChatToolContext(
  request: ChatRequestContext,
  state: ChatInterviewState
): string {
  const { role, scenarioType, solutionComplexity, message } = request
  const { tracker, currentPhase, testsHaveRunNow, testResultsArray } = state
  const isBugFix = scenarioType === "bugfix"
  const isSystemDesign = scenarioType === "system-design"
  // =================================================================
  // TOOL EXECUTION: Pre-execute tools to give AI structured state
  // This ensures the AI always has accurate state information
  // =================================================================
  let toolResultsContext = ""
  if (role === "interviewer" && !isBugFix && !isSystemDesign) {
    const toolContext: ToolContext = {
      tracker: tracker,
      phase: currentPhase,
      isOptimalSolution: solutionComplexity?.isOptimal || false,
      testsHaveRun: testsHaveRunNow || false,
      testsPassed: testResultsArray?.filter((t) => t.passed === true).length || 0,
      testsTotal: testResultsArray?.length || 0,
    }

    // Execute relevant tools based on phase
    const toolCalls: Array<{ name: string; result: ReturnType<typeof executeTool> }> = []

    // Always check prerequisites in discussion/coding phases
    if (currentPhase === "discussion" || currentPhase === "coding") {
      toolCalls.push({
        name: "check_prerequisites",
        result: executeTool("check_prerequisites", {}, toolContext),
      })
      toolCalls.push({
        name: "get_next_required_topic",
        result: executeTool("get_next_required_topic", {}, toolContext),
      })
    }

    // Check what's already discussed in testing phase
    if (currentPhase === "testing") {
      toolCalls.push({
        name: "check_already_discussed:complexity",
        result: executeTool("check_already_discussed", { topic: "complexity" }, toolContext),
      })
      toolCalls.push({
        name: "check_already_discussed:edge_cases",
        result: executeTool("check_already_discussed", { topic: "edge_cases" }, toolContext),
      })
    }

    // Always include phase info
    toolCalls.push({
      name: "get_interview_phase",
      result: executeTool("get_interview_phase", {}, toolContext),
    })

    // Analyze user's message if it seems vague
    if (message && message.length < 80) {
      toolCalls.push({
        name: "analyze_user_response",
        result: executeTool("analyze_user_response", { user_message: message }, toolContext),
      })
    }

    // Format tool results for injection into prompt
    toolResultsContext = formatToolResultsForPrompt(toolCalls)
  }

  return toolResultsContext
}
