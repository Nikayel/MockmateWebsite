/**
 * Case Lab interviewer chat — the AI "spine" across milestones (P4).
 *
 * Rather than thread a lab through the interview-specific `/api/chat` route,
 * this reuses the shared `generateAIResponse` primitive (same rate-limit /
 * cache / cost-tracking path) with a milestone-aware system prompt and the
 * company persona, so the interviewer reacts in character to whatever station
 * the candidate is on.
 *
 * The prompt builder is pure and unit-tested; only `generateCaseLabChatReply`
 * performs the model call.
 */

import { generateAIResponse } from "@/lib/ai-providers"
import type { MilestoneKind } from "@/lib/labs/types"

export interface CaseLabChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface CaseLabChatLab {
  title: string
  company: string
  role: string
  whyThisCompany?: string
}

export interface CaseLabChatParams {
  milestone: MilestoneKind
  messages: CaseLabChatMessage[]
  lab?: CaseLabChatLab
  /** Optional summary of the candidate's current answers, for grounding. */
  context?: string
  userId?: string
}

const MILESTONE_COACHING: Record<MilestoneKind, string> = {
  clarify:
    "They are scoping the problem. Reward sharp clarifying questions; challenge missing dimensions (data freshness, latency/safety, scale). Answer as the interviewer when asked.",
  decompose:
    "They are mapping the system. Push on missing entities and unhandled state transitions (e.g. what happens to a unit mid-task if its job is cancelled).",
  design:
    "They are committing to a contract. Push on every choice — why A over B, what breaks at scale, how the fallback behaves.",
  build:
    "They are coding inside the real codebase. Reference their own design decisions and ask whether the code actually does what they claimed.",
  review:
    "They are reflecting. Frame their performance against this company's bar — concrete, candid, and encouraging.",
}

/** Build the milestone-aware interviewer system prompt. Pure. */
export function buildCaseLabChatSystemPrompt(params: {
  milestone: MilestoneKind
  lab?: CaseLabChatLab
  context?: string
}): string {
  const { milestone, lab, context } = params
  const who = lab
    ? `You are the interviewer for the ${lab.company} ${lab.role} Case Lab "${lab.title}".`
    : "You are a senior engineering interviewer running a Case Lab."

  const parts = [
    who,
    lab?.whyThisCompany ? `Why this company: ${lab.whyThisCompany}` : "",
    `The candidate is on the ${milestone.toUpperCase()} milestone. ${MILESTONE_COACHING[milestone]}`,
    context ? `Candidate's work so far:\n${context}` : "",
    "Stay in character. Keep replies short (2–4 sentences), specific, and Socratic — ask, don't lecture. Never write their solution for them.",
  ]
  return parts.filter(Boolean).join("\n\n")
}

/** Generate the interviewer's next reply for a Case Lab conversation. */
export async function generateCaseLabChatReply(params: CaseLabChatParams): Promise<string> {
  const system = buildCaseLabChatSystemPrompt(params)
  const history = params.messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    content: m.content,
  }))

  // The latest user turn is the prompt; earlier turns are history.
  const last = history[history.length - 1]
  const userMessage = last?.role === "user" ? last.content : "Please react to where I am so far."
  const priorHistory = last?.role === "user" ? history.slice(0, -1) : history

  const response = await generateAIResponse(system, userMessage, priorHistory, {
    userId: params.userId,
    eventType: "chat_message",
    complexity: "standard",
  })
  return response.text
}
