import { Annotation } from "@langchain/langgraph"
import type { GeneratedHint, HintDiagnosis, HintGenerationRequest, HintLevel } from "./types"
export const HintGraphState = Annotation.Root({
  request: Annotation<HintGenerationRequest>(),

  hints: Annotation<GeneratedHint[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  struggleLevel: Annotation<"none" | "mild" | "moderate" | "high">(),
  recommendedRevealLevel: Annotation<HintLevel>(),
  diagnosis: Annotation<HintDiagnosis | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined,
  }),
  llmUsed: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => false,
  }),

  ragContextUsed: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => false,
  }),

  userHistoryUsed: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => false,
  }),

  patternKnowledgeUsed: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => false,
  }),

  finalizedHints: Annotation<GeneratedHint[]>({
    reducer: (_current, update) => update,
    default: () => [],
  }),
})

export type HintGraphStateType = typeof HintGraphState.State
