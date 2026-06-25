/**
 * Case Lab feedback generation.
 *
 * Reuses the shared AI provider layer (`generateFeedbackResponse`, which routes
 * through rate-limiting, caching, and cost tracking with the
 * `feedback_generation` event type) to turn a completed run into the same
 * `structured_feedback` shape the interview pipeline produces — so the Review
 * UI and downstream analytics work unchanged.
 *
 * The prompt builder and parser are pure and unit-tested; only
 * `generateCaseLabFeedback` performs the (expensive) model call.
 */

import { generateFeedbackResponse } from "@/lib/ai-providers"
import type { CaseLabRun } from "@/lib/labs/types"
import type { InterviewSession } from "@/lib/types"

export type CaseLabFeedback = NonNullable<InterviewSession["structured_feedback"]>

const SYSTEM_PROMPT = `You are a senior engineering interviewer giving candid, specific feedback on a candidate's "Case Lab" attempt — a multi-step exercise: Clarify, Decompose, Design, Build (a real multi-file codebase), and Review.

Judge how they scoped ambiguity, decomposed the system, defended design tradeoffs, and whether their code actually works. Be concrete and reference what they did.

Return ONLY a JSON object, no prose, no code fences, with exactly these keys:
{
  "tldr": "one or two sentence overall verdict",
  "whatWorked": ["specific strengths"],
  "fixNext": ["specific, actionable gaps"],
  "actionPlan": ["concrete next steps to improve"]
}`

function list(label: string, items: string[]): string {
  if (!items.length) return `${label}: (none provided)`
  return `${label}:\n${items.map((i) => `  - ${i}`).join("\n")}`
}

/** Build the system + user prompt summarizing a run for feedback generation. Pure. */
export function buildCaseLabFeedbackPrompt(run: CaseLabRun): {
  system: string
  user: string
} {
  const a = run.answers
  const sections: string[] = [`Case Lab: ${run.caseLabId} (mode: ${run.mode})`]

  sections.push(
    list(
      "Clarify — questions & assumptions",
      (a.clarify ?? []).map(
        (c) => `[${c.dimension}] Q: ${c.question || "—"} | Assumes: ${c.assumption || "—"}`
      )
    )
  )

  if (a.decompose) {
    sections.push(list("Decompose — workflow", a.decompose.workflow))
    sections.push(
      list(
        "Decompose — entities",
        a.decompose.entities.map((e) => `${e.name}: ${e.role}`)
      )
    )
    if (a.decompose.stateMachine) {
      const sm = a.decompose.stateMachine
      sections.push(
        `Decompose — state machine for ${sm.entity}: states [${sm.states.join(
          ", "
        )}], ${sm.transitions.length} transition(s)`
      )
    }
  }

  if (a.design) {
    sections.push(
      `Design — API: ${a.design.api.name || "(unnamed)"} (${a.design.api.inputs.length} in / ${a.design.api.outputs.length} out)`
    )
    sections.push(
      list(
        "Design — tradeoffs",
        a.design.tradeoffs.map(
          (t) => `${t.decision}: chose ${t.choice} (A: ${t.optionA} / B: ${t.optionB}) — ${t.why}`
        )
      )
    )
    if (a.design.fallback) sections.push(`Design — fallback: ${a.design.fallback}`)
  }

  if (a.build) {
    const passed = a.build.testResults.filter((t) => t.passed).length
    sections.push(
      `Build — touched ${a.build.touchedFiles.length} file(s); tests ${passed}/${a.build.testResults.length} passing`
    )
  }

  if (a.review?.selfScores) {
    const scores = Object.entries(a.review.selfScores)
      .map(([k, v]) => `${k}: ${v}/5`)
      .join(", ")
    if (scores) sections.push(`Self-grade: ${scores}`)
  }

  return { system: SYSTEM_PROMPT, user: sections.join("\n\n") }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === "string")
}

/**
 * Parse a model response into structured feedback. Tolerates code fences and
 * surrounding prose; falls back to raw text when JSON can't be recovered. Pure.
 */
export function parseCaseLabFeedback(text: string): CaseLabFeedback {
  const trimmed = text.trim()
  // Pull the first {...} block, ignoring ```json fences or chatter around it.
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>
      const tldr = typeof parsed.tldr === "string" ? parsed.tldr : undefined
      const whatWorked = asStringArray(parsed.whatWorked)
      const fixNext = asStringArray(parsed.fixNext)
      const actionPlan = asStringArray(parsed.actionPlan)
      if (tldr || whatWorked.length || fixNext.length || actionPlan.length) {
        return { tldr, whatWorked, fixNext, actionPlan, rawFeedback: trimmed }
      }
    } catch {
      // fall through to raw
    }
  }
  return { rawFeedback: trimmed }
}

/** Generate structured feedback for a run via the AI provider layer. */
export async function generateCaseLabFeedback(
  run: CaseLabRun,
  options: { userId?: string } = {}
): Promise<CaseLabFeedback> {
  const { system, user } = buildCaseLabFeedbackPrompt(run)
  const response = await generateFeedbackResponse(system, user, [], {
    userId: options.userId,
    scenarioId: run.caseLabId,
  })
  return parseCaseLabFeedback(response.text)
}
