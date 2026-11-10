const SESSION = "(?:(?:the|this|my) )?(?:interview|session|debrief)"
const END_SESSION = `(?:end|finish|close|stop|wrap up) ${SESSION}`
const RESULTS =
  "(?:(?:the|my) )?(?:(?:full|detailed) )?(?:interview )?(?:score|results|feedback|scoring screen)"
const VIEW_RESULTS = `(?:see|view|find?|get|access|open) ${RESULTS}`
const COMPLETION_REQUESTS = [
  `(?:please )?(?:${END_SESSION}|(?:show(?: me)?|open|view) ${RESULTS})`,
  `(?:can|could|would|will) you (?:please )?(?:help me )?(?:${END_SESSION}|(?:show(?: me)?|open) ${RESULTS})(?: for me)?`,
  `(?:i want to|i(?:'d| would) like to|let'?s|can we|could we) ${END_SESSION}`,
  `(?:how|where) (?:(?:do|can|should) i|to) (?:${END_SESSION}|${VIEW_RESULTS})`,
  `(?:can|could|may) i ${VIEW_RESULTS}`,
  `where (?:is|are) ${RESULTS}`,
  `i (?:can't|cannot|don't know how to) (?:find|open|access) ${RESULTS}`,
].map((request) => new RegExp(`^${request}(?: now)?(?: please)?$`, "i"))

/** Fail closed on ambiguous wording; the candidate can always use View feedback. */
export function requestsInterviewCompletion(message: string): boolean {
  const normalized = message
    .trim()
    .replace(/’/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.!? ]+$/, "")
  return COMPLETION_REQUESTS.some((request) => request.test(normalized))
}
