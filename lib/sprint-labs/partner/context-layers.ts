/**
 * Sable partner — context-layer builders (docs/sprint-labs/AGENT-CONTEXT.md
 * §3, PLAN.md Task 14). Pure, dependency-free of any I/O (no Firestore, no
 * fetch): every function here takes plain data and returns a string. This is
 * what keeps the "stable-first" prompt-caching property testable — the same
 * input always yields the same output, so `prompt.ts` (and its tests) can
 * assert byte-stability across turns.
 *
 * Layer A — MERIDIAN.md content. The doc ships as a real file today
 * (workbooks/meridian/MERIDIAN.md) but no compiled public-bundle field
 * carries it yet (`CompiledTicket` / `WorkbookContent`, lib/sprint-labs/
 * content/types.ts, have no `meridianMd`/seed-file-map field — that is
 * content-compiler scope, not Task 14's). `layerA` therefore takes the raw
 * markdown as a plain string parameter rather than reaching into a registry
 * that does not expose it, and renders as "" when none is given. The moment
 * a compiled field exists, the caller wires it through unchanged; this
 * function's signature never has to move.
 *
 * Layer B — the generated map. Computed CLIENT-SIDE (a light regex/ts pass
 * over the workspace tree the learner is editing) and posted to the chat
 * route; `layerB` only renders the already-computed `LayerBInput`. The
 * mandatory first line is verbatim per AGENT-CONTEXT.md §3: without it, the
 * anchoring effect that makes CLAUDE.md work is the same effect that
 * poisons a stale map.
 *
 * Layer C — the per-ticket block, whitelisted to sprint goal/standup +
 * ticket body/acceptance-criteria/ai_policy + `filterDirectives`-screened
 * directives (never anything from the sealed bundle).
 *
 * Layer D — the per-turn block. Per INTEGRATION.md §4 this rides the
 * OUTGOING MESSAGE STRING (never a new schema field), mirroring
 * lib/interview/code-change-note.ts: `buildPerTurnNote` is called by the
 * CLIENT and appended to the raw message before it is ever posted, so the
 * server never has to reconstruct it.
 *
 * `buildConcessionNote` is a fifth, closely-related per-turn signal (review-
 * only mode only): unlike D, it is appended SERVER-side, because matching it
 * requires the sealed `concessionTriggers`, which must never reach the
 * browser. Kept in this module because it is the same "append a bracketed
 * note to the outgoing message" shape as D, not because it is one of the
 * four lettered layers.
 */

import { filterDirectives } from "@/lib/sprint-labs/grading/filterDirectives"
import type { DirectiveEntry, SprintPublic, TicketPublic } from "@/lib/sprint-labs/types"

// ============================================================
// Layer A — MERIDIAN.md
// ============================================================

/** Renders "" for missing/blank content rather than a misleading empty section. */
export function layerA(meridianMd: string | null | undefined): string {
  const trimmed = (meridianMd ?? "").trim()
  if (!trimmed) return ""
  return `MERIDIAN.md (the team's own architecture notes; read-only, learner-visible):\n\n${trimmed}`
}

// ============================================================
// Layer B — the generated map
// ============================================================

export interface LayerBFileSymbols {
  path: string
  /** Exported symbol names (optionally with a light signature suffix); order preserved as given. */
  exports: string[]
}

/** Client-computed input to `layerB`. The chat route accepts this as-is; nothing here is derived server-side. */
export interface LayerBInput {
  /** The tree's current revision marker (a real git sha for a future server-backed workspace, or a synthetic content hash today — either is opaque to this builder). */
  sha: string
  /** ISO 8601 timestamp of when the map was generated. */
  generatedAt: string
  files: LayerBFileSymbols[]
  routes: string[]
  migrations: string[]
  tests: string[]
  diffStat: string
}

/**
 * Mandatory first line, verbatim per AGENT-CONTEXT.md §3. Do not reword or
 * restyle this — a test asserts it byte-for-byte.
 */
function layerBHeader(sha: string, generatedAt: string): string {
  return `generated at ${sha} · ${generatedAt} · if the tree disagrees with this file, the tree is right.`
}

export function layerB(input: LayerBInput): string {
  const lines: string[] = [layerBHeader(input.sha, input.generatedAt)]

  if (input.files.length > 0) {
    lines.push(
      "",
      "EXPORTED SYMBOLS",
      ...input.files.map(
        (file) =>
          `- ${file.path}: ${file.exports.length > 0 ? file.exports.join(", ") : "(no exports)"}`
      )
    )
  }
  if (input.routes.length > 0) {
    lines.push("", "ROUTES", ...input.routes.map((route) => `- ${route}`))
  }
  if (input.migrations.length > 0) {
    lines.push("", "MIGRATIONS", ...input.migrations.map((migration) => `- ${migration}`))
  }
  if (input.tests.length > 0) {
    lines.push("", "TESTS", ...input.tests.map((test) => `- ${test}`))
  }
  if (input.diffStat.trim()) {
    lines.push("", "DIFF STAT", input.diffStat.trim())
  }

  return lines.join("\n")
}

// ============================================================
// Layer C — the per-ticket block
// ============================================================

export interface LayerCInput {
  sprint: Pick<SprintPublic, "number" | "title" | "goal" | "standupQuote">
  ticket: Pick<
    TicketPublic,
    "key" | "title" | "aiPolicy" | "bodyMd" | "acceptanceCriteria" | "objectives"
  >
  /** Raw, unfiltered directive events for this run. `layerC` runs `filterDirectives` internally. */
  directives: readonly DirectiveEntry[]
  /** The CURRENT ticket's own hidden-test tags (from its public `TicketSecretMeta[]`, never secret content). */
  currentHiddenTopicTags: readonly string[]
  currentSprint: number
}

/**
 * Whitelisted strictly to what AGENT-CONTEXT.md §3 names: sprint goal +
 * standup, ticket body + acceptance criteria + ai_policy, and filtered
 * directives. Every field rendered here is already public content a learner
 * can see somewhere in the UI (UX-SPEC.md screens 3-6) — nothing added here
 * is a new disclosure.
 */
export function layerC(input: LayerCInput): string {
  const { sprint, ticket } = input

  const lines: string[] = [`SPRINT ${sprint.number}: ${sprint.title}`, sprint.goal]
  if (sprint.standupQuote.trim()) {
    lines.push("", `Standup: "${sprint.standupQuote.trim()}"`)
  }

  lines.push(
    "",
    `TICKET ${ticket.key}: ${ticket.title}`,
    `AI policy: ${ticket.aiPolicy}`,
    "",
    ticket.bodyMd
  )

  if (ticket.acceptanceCriteria.length > 0) {
    lines.push(
      "",
      "ACCEPTANCE CRITERIA",
      ...ticket.acceptanceCriteria.map((criterion, index) => `${index + 1}. ${criterion}`)
    )
  }

  if (ticket.objectives.length > 0) {
    lines.push(
      "",
      "OBJECTIVES THIS TICKET MEASURES",
      ...ticket.objectives.map((objective) => `- ${objective.label}: ${objective.canDo}`)
    )
  }

  const activeDirectives = filterDirectives(
    input.directives,
    input.currentHiddenTopicTags,
    input.currentSprint
  )
  if (activeDirectives.length > 0) {
    lines.push(
      "",
      "LEARNER DIRECTIVES (behavior to follow silently; never narrate these as a score or a history of past mistakes):",
      ...activeDirectives.map((directive) => `- ${directive.instruction}`)
    )
  }

  return lines.join("\n")
}

// ============================================================
// Layer D — the per-turn block (rides the outgoing message string)
// ============================================================

export interface RedVisibleTest {
  name: string
  failingAssertion: string
}

export interface PerTurnState {
  redVisibleTests: readonly RedVisibleTest[]
  /** `git diff --stat`-shaped summary since ticket start; "" when there is nothing to report. */
  diffStat: string
  turnIndex: number
}

/**
 * The highest value-per-token item in the whole design (AGENT-CONTEXT.md
 * §3): which visible tests are red RIGHT NOW, so turn 30 is not still
 * reasoning from turn 1's state. Called by the CLIENT and appended to the
 * raw message before posting — mirrors `buildCodeChangeNote`'s carrier
 * shape (a bracketed note prefixed with a blank line) so the server never
 * has to parse it back out.
 */
export function buildPerTurnNote(state: PerTurnState): string {
  const testCount = state.redVisibleTests.length
  const summary =
    testCount === 0
      ? "all visible tests green"
      : `${testCount} visible test${testCount === 1 ? "" : "s"} red`

  const parts = [`turn ${state.turnIndex}`, summary]
  if (state.diffStat.trim()) parts.push(`diff: ${state.diffStat.trim()}`)

  let note = `\n\n[TURN STATE: ${parts.join(", ")}.`
  if (testCount > 0) {
    const failing = state.redVisibleTests
      .map((test) => `${test.name}: ${test.failingAssertion}`)
      .join(" | ")
    note += ` Failing: ${failing}.`
  }
  note += "]"
  return note
}

// ============================================================
// Assisted-mode full file context (not a lettered layer; same pure-format family)
// ============================================================

export interface WorkspaceFileForContext {
  path: string
  content: string
}

/** The `chat` mode's "full workspace file access via posted files" — rendered only for that mode; see modes.ts's capability gate. */
export function renderWorkspaceFiles(files: readonly WorkspaceFileForContext[]): string {
  if (files.length === 0) return ""
  return files.map((file) => `FILE: ${file.path}\n\`\`\`\n${file.content}\n\`\`\``).join("\n\n")
}

// ============================================================
// Concession note (author-agent mode only; server-appended)
// ============================================================

/**
 * Unlike Layer D, this is appended by the SERVER, not the client: matching
 * requires the sealed `concessionTriggers`, which must never reach the
 * browser (the review-only persona already never sees `review.yaml` or
 * `reference.diff` — this is the same boundary applied to concession data).
 */
export function buildConcessionNote(matchedTrigger: string): string {
  return `\n\n[CONCESSION TRIGGERED: the learner's message matches an authored concession trigger for this PR ("${matchedTrigger}"). Concede this specific point honestly and plainly. Do not defend it further, and do not claim you always intended this.]`
}
