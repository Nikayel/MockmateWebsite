// lib/agents/hints/graph.ts

import { END, START, StateGraph } from "@langchain/langgraph"
import type { HintGenerationRequest, HintGenerationResponse } from "./types"
import { HintGraphState } from "./graph-state"
import {
  addPatternHints,
  addRagHint,
  addTestFailureHints,
  addUserHistoryHints,
  ensureAtLeastOneHint,
  finalizeHints,
  generateLlmHints,
  prepareState,
} from "./graph-nodes"

const hintGraph = new StateGraph(HintGraphState)
  .addNode("prepareState", prepareState)
  .addNode("generateLlmHints", generateLlmHints)
  .addNode("addPatternHints", addPatternHints)
  .addNode("ensureAtLeastOneHint", ensureAtLeastOneHint)
  .addNode("addRagHint", addRagHint)
  .addNode("addUserHistoryHints", addUserHistoryHints)
  .addNode("addTestFailureHints", addTestFailureHints)
  .addNode("finalizeHints", finalizeHints)
  .addEdge(START, "prepareState")
  .addEdge("prepareState", "generateLlmHints")
  .addEdge("generateLlmHints", "addPatternHints")
  .addEdge("addPatternHints", "ensureAtLeastOneHint")
  .addEdge("ensureAtLeastOneHint", "addRagHint")
  .addEdge("addRagHint", "addUserHistoryHints")
  .addEdge("addUserHistoryHints", "addTestFailureHints")
  .addEdge("addTestFailureHints", "finalizeHints")
  .addEdge("finalizeHints", END)
  .compile()

export async function runHintGraph(
  request: HintGenerationRequest
): Promise<HintGenerationResponse> {
  const startTime = Date.now()

  const result = await hintGraph.invoke({
    request,
  })

  return {
    hints: result.finalizedHints,
    struggleLevel: result.struggleLevel,
    recommendedRevealLevel: result.recommendedRevealLevel,
    personalizationApplied: result.userHistoryUsed,
    metadata: {
      generationTimeMs: Date.now() - startTime,
      ragContextUsed: result.ragContextUsed,
      userHistoryUsed: result.userHistoryUsed,
      patternKnowledgeUsed: result.patternKnowledgeUsed,
    },
  }
}
