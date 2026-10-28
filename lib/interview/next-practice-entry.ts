import {
  recommendationDecisionIdSchema,
  recommendationSessionIdSchema,
} from "@/lib/agents/recommendations/decision-contract"

export interface NextPracticeEntry {
  decisionId?: string
  sourceSessionId: string
  scenarioId: string
  returnSource?: "feedback" | "dashboard" | "reminder"
}

/** Capture before the interview adds its new session ID to the URL. */
export function getNextPracticeEntry(
  params: Pick<URLSearchParams, "get"> | null
): NextPracticeEntry | null {
  if (
    !params ||
    params.get("source") !== "next-practice" ||
    params.get("session") ||
    params.get("practice") === "true" ||
    params.get("roadmap") === "true"
  )
    return null
  const scenarioId = recommendationSessionIdSchema.safeParse(params.get("scenario"))
  const sourceSessionId = recommendationSessionIdSchema.safeParse(params.get("fromSession"))
  const decisionId = recommendationDecisionIdSchema.safeParse(params.get("decisionId"))
  const entry = params.get("return")
  return scenarioId.success && sourceSessionId.success
    ? {
        sourceSessionId: sourceSessionId.data,
        ...(decisionId.success ? { decisionId: decisionId.data } : {}),
        scenarioId: scenarioId.data,
        ...(entry === "dashboard" || entry === "reminder" ? { returnSource: entry } : {}),
      }
    : null
}

export function isNextPracticeEntry(params: Pick<URLSearchParams, "get"> | null): boolean {
  return getNextPracticeEntry(params) !== null
}
