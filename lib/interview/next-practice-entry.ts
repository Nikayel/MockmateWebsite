export interface NextPracticeEntry {
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
  const scenarioId = params.get("scenario")
  const sourceSessionId = params.get("fromSession")
  const validId = (value: string | null): value is string =>
    Boolean(value && value.trim() === value && /^[^/\x00-\x1f]{1,200}$/.test(value))
  const entry = params.get("return")
  return validId(scenarioId) && validId(sourceSessionId)
    ? {
        sourceSessionId,
        scenarioId,
        ...(entry === "dashboard" || entry === "reminder" ? { returnSource: entry } : {}),
      }
    : null
}

export function isNextPracticeEntry(params: Pick<URLSearchParams, "get"> | null): boolean {
  return getNextPracticeEntry(params) !== null
}
