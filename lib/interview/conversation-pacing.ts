import type { SessionContext } from "./session-context/schema"
import { extractTopicsFromMessage, extractUserAnsweredTopics } from "./topic-extraction"

export interface InterviewTurn {
  type?: string
  message?: string
}

/** Sparra messages are not replies to Sable, even when both panels share a timeline. */
export function getInterviewerTurns(
  session: Pick<SessionContext, "timeline"> | undefined,
  legacy: InterviewTurn[] = []
): Array<{ type: string; message: string }> {
  const turns = session?.timeline
    .filter((entry) => entry.lane === "interviewer")
    .map((entry) => ({
      type: entry.role === "candidate" ? "user" : "ai",
      message: entry.content,
    }))
  return turns?.length
    ? turns
    : legacy.map((turn) => ({ type: turn.type ?? "ai", message: turn.message ?? "" }))
}

export function getProactiveBlockReason(turns: InterviewTurn[] = []): string | null {
  const lastCandidate = turns.findLastIndex((turn) => turn.type === "user")
  const sinceCandidate = turns
    .slice(lastCandidate + 1)
    .filter((turn) => ["ai", "assistant", "model", "interviewer"].includes(turn.type ?? ""))
  if (
    sinceCandidate.some((turn) =>
      /\?|\b(tell me|walk me through|describe|explain)\b/i.test(turn.message ?? "")
    )
  ) {
    return "Waiting for the candidate to respond; do not stack another question"
  }
  if (sinceCandidate.length >= 2) {
    return "Already checked in since the candidate last spoke"
  }
  return null
}

/** Counts are a prompt reminder, not a semantic judgment of answer quality. */
export function buildDebuggingPacingGuidance(turns: InterviewTurn[] = []): string {
  const counts = new Map<string, number>()
  const answered = new Set<string>()
  for (const turn of turns) {
    if (turn.type === "user") {
      for (const topic of extractUserAnsweredTopics(turn.message ?? "")) {
        if (topic.startsWith("debugging ")) answered.add(topic)
      }
    } else {
      for (const topic of extractTopicsFromMessage(turn.message ?? "")) {
        if (topic.startsWith("debugging ")) counts.set(topic, (counts.get(topic) ?? 0) + 1)
      }
    }
  }
  if (!counts.size && !answered.size) return ""
  return `\nDEBUGGING CONVERSATION PACING (history-derived signals, not scores):
${[...counts].map(([topic, count]) => `- ${topic}: ${count} probe(s).${count >= 2 ? " Stop this line of questioning; do not paraphrase it a third time." : " At most one useful follow-up, only if needed."}`).join("\n")}
${[...answered].map((topic) => `- Candidate has expressed ${topic}; read their actual words, do not demand formal phrasing.`).join("\n")}
Do not repeat a covered concern or turn an unanswered question into a diagnostic hint. Answer a new candidate question directly; otherwise acknowledge and leave space to investigate.\n`
}
