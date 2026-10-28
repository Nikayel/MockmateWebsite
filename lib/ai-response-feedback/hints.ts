import type { GeneratedHint } from "@/lib/agents/hints/types"
import { registerResponseGeneration } from "./generations"

/** A batch shares generation/cost identity; each returned hint keeps its own output identity. */
export async function registerHintResponses(
  hints: GeneratedHint[],
  context: { generationId: string; userId: string; sessionId?: string; scenarioId: string }
): Promise<GeneratedHint[]> {
  if (!hints.length) return hints
  const registered = await registerResponseGeneration({
    ...context,
    kind: "hint",
    outputs: hints.map((hint) => ({
      id: hint.id,
      content: hint.content,
      source: hint.source,
      level: hint.level,
    })),
  })
  return hints.map((hint) => ({
    ...hint,
    ...(registered ? { generationId: context.generationId } : {}),
  }))
}
