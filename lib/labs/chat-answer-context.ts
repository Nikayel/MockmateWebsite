/**
 * Pure serializer that turns a candidate's actual Case Lab answers into a
 * compact, real-excerpt context string for the interviewer chat (PF-02).
 *
 * The chat route previously received only COUNTS ("Clarify: 2 questions",
 * "7/10 passing"), so the interviewer could never react to what the candidate
 * actually wrote — the core "grounded interviewer" promise was hollow. This
 * emits the real questions, entities, tradeoffs, and (critically) the names of
 * FAILING tests, weighted toward the current milestone, under a char budget so
 * it stays well within the route's context cap.
 */

import type { CaseLabAnswers, MilestoneKind } from "@/lib/labs/types"

const DEFAULT_BUDGET = 3000
/** Cap noisy repeated rows so one milestone can't crowd out the rest. */
const MAX_ROWS = 6

function truncate(value: string, max: number): string {
  const v = value.trim()
  return v.length > max ? `${v.slice(0, max - 1)}…` : v
}

function clarifyLines(answers: CaseLabAnswers): string[] {
  const rows = answers.clarify ?? []
  if (!rows.length) return []
  const shown = rows
    .filter((c) => c.question?.trim() || c.assumption?.trim())
    .slice(0, MAX_ROWS)
    .map(
      (c) =>
        `  - [${c.dimension || "?"}] Q: ${truncate(c.question || "—", 160)} | Assumes: ${truncate(
          c.assumption || "—",
          160
        )}`
    )
  if (!shown.length) return []
  return ["Clarify — questions & assumptions:", ...shown]
}

function decomposeLines(answers: CaseLabAnswers): string[] {
  const d = answers.decompose
  if (!d) return []
  const lines: string[] = []
  const workflow = (d.workflow ?? []).filter((s) => s.trim()).slice(0, MAX_ROWS)
  if (workflow.length) {
    lines.push("Decompose — workflow:")
    workflow.forEach((s) => lines.push(`  - ${truncate(s, 140)}`))
  }
  const entities = (d.entities ?? []).filter((e) => e.name?.trim()).slice(0, MAX_ROWS)
  if (entities.length) {
    lines.push("Decompose — entities:")
    entities.forEach((e) => lines.push(`  - ${e.name}: ${truncate(e.role || "—", 120)}`))
  }
  if (d.stateMachine?.entity) {
    const sm = d.stateMachine
    lines.push(
      `Decompose — state machine for ${sm.entity}: states [${(sm.states ?? []).join(", ")}], ${
        (sm.transitions ?? []).length
      } transition(s)`
    )
  }
  return lines
}

function designLines(answers: CaseLabAnswers): string[] {
  const d = answers.design
  if (!d) return []
  const lines: string[] = []
  if (d.api?.name) {
    const ins = (d.api.inputs ?? []).map((f) => `${f.name}: ${f.type}`).join(", ")
    const outs = (d.api.outputs ?? []).map((f) => `${f.name}: ${f.type}`).join(", ")
    lines.push(`Design — API ${d.api.name}(${ins}) -> {${outs}}`)
  }
  const tradeoffs = (d.tradeoffs ?? []).filter((t) => t.decision?.trim()).slice(0, MAX_ROWS)
  if (tradeoffs.length) {
    lines.push("Design — tradeoffs:")
    tradeoffs.forEach((t) =>
      lines.push(
        `  - ${truncate(t.decision, 100)}: chose ${truncate(t.choice || "?", 60)} — ${truncate(
          t.why || "—",
          120
        )}`
      )
    )
  }
  if (d.fallback?.trim()) lines.push(`Design — fallback: ${truncate(d.fallback, 200)}`)
  return lines
}

function buildLines(answers: CaseLabAnswers): string[] {
  const b = answers.build
  if (!b) return []
  const results = b.testResults ?? []
  const passed = results.filter((t) => t.passed).length
  const failing = results.filter((t) => !t.passed).map((t) => t.name)
  const lines = [
    `Build — touched ${(b.touchedFiles ?? []).length} file(s); tests ${passed}/${results.length} passing`,
  ]
  if (failing.length) lines.push(`Build — FAILING tests: ${failing.slice(0, MAX_ROWS).join(", ")}`)
  return lines
}

function reviewLines(answers: CaseLabAnswers): string[] {
  const scores = answers.review?.selfScores
  if (!scores) return []
  const entries = Object.entries(scores)
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => `${k}: ${v}/5`)
  return entries.length ? [`Review — self-grade: ${entries.join(", ")}`] : []
}

/**
 * Serialize the candidate's real answers, weighted toward the current
 * milestone (its section is placed first so it survives the budget), then the
 * rest for cross-milestone continuity. Returns "" when nothing is filled in.
 */
export function buildCaseLabAnswerContext(
  answers: CaseLabAnswers | undefined,
  currentMilestone: MilestoneKind,
  budget: number = DEFAULT_BUDGET
): string {
  if (!answers) return ""

  const byMilestone: Record<MilestoneKind, string[]> = {
    clarify: clarifyLines(answers),
    decompose: decomposeLines(answers),
    design: designLines(answers),
    build: buildLines(answers),
    review: reviewLines(answers),
  }

  const order: MilestoneKind[] = ["clarify", "decompose", "design", "build", "review"]
  // Current milestone first (most relevant to react to), then the rest in order.
  const ordered = [currentMilestone, ...order.filter((m) => m !== currentMilestone)]

  const blocks = ordered.map((m) => byMilestone[m]).filter((b) => b.length > 0)
  const text = blocks.map((b) => b.join("\n")).join("\n\n")
  return truncate(text, budget)
}
