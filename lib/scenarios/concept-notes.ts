/** Public foundations, shared by task documents and the optional explanation dialog. */
export const SCENARIO_CONCEPTS = {
  "exception-handling": {
    title: "Exception handling",
    summary: "When an operation fails, an exception carries that failure to a handler.",
    intuition:
      "A function asks another function to do some work. If that work fails, normal execution stops. A handler decides whether it can recover or must let its caller deal with the failure.",
    example:
      "A missing settings file might have a documented default. A programming mistake needs investigation. Giving every failure the same response can hide the difference.",
    systemsIntuition:
      "A timeout means a reply did not arrive. It does not prove that a remote operation did nothing. Understand the operation's contract before deciding what to do next.",
  },
} as const

export type ScenarioConceptId = keyof typeof SCENARIO_CONCEPTS

export function conceptNoteMarkdown(id: ScenarioConceptId): string {
  const concept = SCENARIO_CONCEPTS[id]
  return `## Concept: ${concept.title}\n\n${concept.summary}\n\n${concept.intuition}\n\n${concept.example}\n\n**Systems intuition:** ${concept.systemsIntuition}`
}
