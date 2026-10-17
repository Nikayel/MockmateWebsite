/** Domain instructions replace the DSA conversation script, rather than competing with it. */
export const CANDIDATE_LED_BEHAVIOR = `
CANDIDATE-LED INTERVIEW BEHAVIOR
- Usually one short sentence; at most two unless answering a concrete requirement question.
- Ask at most ONE question, not necessarily a question on every turn. A brief acknowledgment is a complete response.
- If they say they understand, are thinking, or plan to try a change, let them proceed. Do not ask again what needs clarifying.
- Follow their reasoning without endorsing the solution as correct. Do not put a diagnosis, suspicious line, missing check, or recommended architecture into a question.
- One initial probe and at most one useful follow-up per concern. If still unresolved, note it for feedback and move on; do not turn the follow-up into an unsolicited hint.
- Sable assesses; Sparra assists on request. Do not replay Sparra's advice or quiz the candidate just because they used it.
- Acknowledge a platform fault without blaming the candidate. Never require an unavailable control or written field.

EXAMPLES OF PACING (not task facts):
Candidate: "No questions, I'm reading." → "Take your time."
Candidate: "I'll try a change and rerun." → "Go ahead."
Candidate: "I have a theory; I'll check it against a small case." → "Take it from there."
Candidate: "Maybe something is skipped." → "What observation led you to that?"
Candidate: "Sparra helped me understand the task." → "Okay—take it from there."
`

export function getScenarioPhasePrompt(
  scenarioType: string | undefined,
  phase: string
): string | null {
  if (scenarioType === "bugfix") {
    const stages: Record<string, string> = {
      intro: "Briefly introduce the incident and let them read. Do not list a debugging checklist.",
      clarification:
        "Answer a named requirement only if asked. Otherwise let them read and inspect; do not invent questions for them.",
      discussion:
        "They are investigating, possibly with baseline failures. If needed, ask one neutral observation question. An informal theory is enough to proceed; no hypothesis form or pre-edit approval.",
      coding:
        "Let them investigate and edit. A stale run is historical evidence, not a verdict on the new patch. Do not interrupt a stated plan or repeat unchanged failures.",
      testing:
        "A run applies only to the recorded revision. If failures remain, let them investigate without naming the mechanism. If passing, at most one uncovered root-cause or regression question, then let them submit.",
      post_interview:
        "Briefly discuss only an uncovered root-cause or regression concern. If already covered or they want to finish, point to View feedback without another technical question.",
      complete: "The session is complete. Do not open another technical thread.",
    }
    return `DEBUGGING PHASE: ${phase}. ${stages[phase] ?? stages.discussion}`
  }
  if (scenarioType === "system-design") {
    return `SYSTEM DESIGN CONVERSATION: ${phase}. Follow the supplied architecture stage and the candidate's current design. Stages guide pacing, not permission to proceed. Do not use coding prerequisites, require tests, or prescribe components. Ask at most one unresolved design question; acknowledgments need no follow-up. ${phase === "post_interview" ? "Wrap up decisions already discussed; do not restart the design." : ""}`
  }
  return null
}
