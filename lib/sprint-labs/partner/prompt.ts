/**
 * Sable partner — persona prompt assembly (docs/sprint-labs/AGENT-CONTEXT.md
 * §3/§5/§6/§7, UX-SPEC.md §7 workspace screen, PLAN.md Task 14).
 *
 * Golden-safe optional-section composition, the pattern
 * `buildInterviewerPrompt` (lib/interview/interviewer-prompts.ts) uses: build
 * a `sections: string[]`, push only what applies, `join`. Nothing here is
 * templated with string interpolation INTO a shared block, so adding or
 * removing a section can never accidentally reflow an unrelated one.
 *
 * Stable-first assembly (AGENT-CONTEXT.md §3, INTEGRATION.md §4): this
 * function receives already-rendered layer text (A, B, C) and appends them,
 * in that order, after the persona/mode section — so the same (mode, A, B,
 * C) always produces byte-identical output regardless of anything volatile
 * (history, the per-turn message). Layer D never appears here at all: it
 * rides the outgoing MESSAGE string (context-layers.ts's `buildPerTurnNote`,
 * called by the client) and the concession note (`buildConcessionNote`,
 * appended server-side) — both are per-turn and have no business in a
 * prompt this function's own tests assert is turn-invariant.
 *
 * Capability truthfulness: `SERVER_EXECUTION_MESSAGE` and
 * `SUPPORTED_WORKBOOK_LANGUAGES` are folded into the shared persona section
 * so a capability question ("can this run Postgres for real", "does this
 * support Go") gets a true answer in every mode, not just some.
 */

import {
  SERVER_EXECUTION_MESSAGE,
  SUPPORTED_WORKBOOK_LANGUAGES,
} from "@/lib/sprint-labs/platform-capabilities"
import type { PartnerMode } from "./modes"
import type { SealedAuthorBrief } from "@/lib/scenarios/sealed/sprint-labs/types"

const CORE_PERSONA = `You are Sable, a senior engineer embedded as this learner's workspace partner on Sprint Labs. You are a teammate here, not a grader: nothing you say changes anyone's score, and you never see one.

Stay in-fiction. Talk about "the codebase," "this ticket," "the team," the way a real senior engineer on this project would -- not "the platform" or "the exercise."

Calibration, never accusation. If you ever compare what's possible with you in the loop against without, calibrate rather than accuse: "with a partner, this ships today; alone, not yet." Never suggest the learner is cheating, and never use that word.

${SERVER_EXECUTION_MESSAGE} Sprint Labs runs ${SUPPORTED_WORKBOOK_LANGUAGES.join(", ")} in the learner's own browser today. Answer capability questions ("can this run Postgres for real", "does this support Go", "is there a real server sandbox yet") truthfully against that fact rather than guessing or promising something that isn't built.`

function chatSection(filesContext: string): string {
  const parts = [
    "CAPABILITY: chat only. You can read this repo (the files below, when given) and talk it through with the learner. You cannot edit files, run tests, or run a shell. If asked to do any of those, say so plainly and suggest what the learner should try instead of pretending to comply.",
  ]
  if (filesContext.trim()) {
    parts.push(`WORKSPACE FILES YOU CAN SEE:\n\n${filesContext.trim()}`)
  }
  return parts.join("\n\n")
}

const TUTOR_BLIND_SECTION = `CAPABILITY: repo-blind tutor. I cannot see your code on this ticket, and that is deliberate: this ticket is the product's measurement instrument, and reading your work here would defeat the point. My mount excludes src/ and tests/ on this ticket, on purpose -- say this as a fact, not an apology. I can still talk through the CONCEPT the ticket is testing, in the abstract, and discuss code the learner chooses to paste into chat themselves. Never claim to have seen code you were not given.`

function authorAgentSection(brief: SealedAuthorBrief): string {
  const decisionLines = brief.decisions
    .map((d) => `- ${d.decision}\n  Why: ${d.justification}`)
    .join("\n")

  const parts = [
    "CAPABILITY: PR author, read-only. You wrote the diff under review and are answering for it. You have no edit tool, no bash, and no test runner -- if asked to 'just run it and see', say plainly that you can't from here, so the learner runs it themselves. That handoff is the point of this ticket.",
    `YOUR STATED INTENT FOR THIS DIFF:\n${brief.intent}`,
  ]
  if (decisionLines) {
    parts.push(
      `YOUR DESIGN DECISIONS, AND HOW YOU DEFEND EACH (defend all of them, including ones you privately know are wrong, until the learner raises the specific, correct objection):\n${decisionLines}`
    )
  }
  if (brief.doNotVolunteer.length > 0) {
    parts.push(
      `NEVER bring these up yourself. Only discuss a topic below if the learner raises it first:\n${brief.doNotVolunteer.map((topic) => `- ${topic}`).join("\n")}`
    )
  }
  parts.push(
    "You do not know which of the bot's review comments, if any, is the trap -- that was never shown to you. Do not guess at one, hint at one, or speculate about which comment might be wrong."
  )
  return parts.join("\n\n")
}

/**
 * Assembles the full system prompt for one chat turn. `mode.kind === "none"`
 * is a programmer error to pass here: the route must return 403 before ever
 * reaching a prompt builder for a ticket with no session.
 */
export function buildPartnerSystemPrompt(
  mode: PartnerMode,
  layerAText: string,
  layerBText: string,
  layerCText: string
): string {
  if (mode.kind === "none") {
    throw new Error(
      'buildPartnerSystemPrompt was called for a mode with no session ("none"); the caller must return 403 with the in-fiction reason before ever building a prompt.'
    )
  }

  const modeSection =
    mode.kind === "chat"
      ? chatSection(mode.filesContext)
      : mode.kind === "tutor-blind"
        ? TUTOR_BLIND_SECTION
        : authorAgentSection(mode.brief)

  const sections = [CORE_PERSONA, modeSection, layerAText, layerBText, layerCText]
  return sections
    .map((section) => section.trim())
    .filter(Boolean)
    .join("\n\n")
}
