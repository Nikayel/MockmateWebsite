/** Candidate-visible workload and coaching only. Answers stay in sealed scenarios. */
export const COMMENT_THREAD_MERGE_WORKLOAD =
  "Large documents may hold 10,000 existing threads and receive 1,000 updates in a sync."

export function buildBugfixTradeoffContext(
  scenarioType: string | undefined,
  scenarioId: string | undefined,
  role: "interviewer" | "partner"
): string {
  if (scenarioType !== "bugfix" || scenarioId !== "bugfix-comment-thread-merge") return ""

  return `DEBUGGING FIX TRADE-OFF FOCUS:
${COMMENT_THREAD_MERGE_WORKLOAD}
- First establish a correct fix with test evidence. Then compare the submitted approach with the simplest adequate alternative, preserving order, partial updates, and repeated-update behavior.
- Define n as existing threads and m as incoming updates. Evaluate total work and extra memory separately; an individual lookup's cost is not the cost of the entire merge.
- Passing tests establishes tested behavior, not efficiency. Do not infer implementation quality from edited-file count or claim optimality from heuristic complexity estimates.
- Ground any comparison in the current implementation. If code is incomplete or unavailable, say efficiency is unverified.
${
  role === "interviewer"
    ? "- After a verified fix, ask one concise comparison question and wait. Respect already-answered topics; do not reveal the repair or an alternative implementation. During debrief, pinpoint one observed trade-off in their code."
    : "- When the candidate asks for help comparing fixes, explain the work/memory trade-off in their code. Before verification, prioritize the failing behavior. Offer a small hint before a rewrite; do not volunteer the solution."
}`
}
