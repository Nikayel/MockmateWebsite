/**
 * State-scoped pack prompt block (PLAN.md Sprint 1 item 4; INTERVIEWER_SPEC.md persona
 * rules + hint ladder). Injected into the candidate-facing interviewer prompt via
 * `buildBugFixContext`. It contains ONLY the current state's goal, the persona rules,
 * and the current hint-ladder level — never any later-state information, and never any
 * sealed content (bug location, fix, red-herring verdicts). State 1's rule "never leak
 * later-state info" applies to this builder itself.
 *
 * Pure + deterministic so the sealing test can assemble every state's block and assert
 * zero overlap with the sealed module.
 */

import { packStateGoal, type PackState } from "./machine"

export interface PackChatState {
  state: PackState
  /** 0-3; if omitted, derived from `nonAdvancingTurns`. */
  hintLevel?: number
  nonAdvancingTurns?: number
}

/** Escalate one ladder level for every 2 consecutive non-advancing turns, capped at 3. */
export function recommendedHintLevel(nonAdvancingTurns: number): number {
  if (nonAdvancingTurns <= 0) return 0
  return Math.min(3, Math.floor(nonAdvancingTurns / 2))
}

/**
 * The hint-ladder instruction for a level. These describe HOW MUCH to reveal in
 * process terms; they never contain the answer, so they are safe in the client prompt.
 */
export function packHintLadder(level: number): string {
  switch (Math.max(0, Math.min(3, level))) {
    case 0:
      return "L0: restate the current state's goal as a question. Reveal nothing new."
    case 1:
      return "L1: point at the right artifact (the correct rows, the run output, a specific file) without interpreting it for them."
    case 2:
      return "L2: point at the mechanism (which value, computed where, relative to which loop) but make them state what is wrong with it."
    case 3:
    default:
      return "L3: lay out the structure explicitly and walk them to the door, but the candidate must say the final sentence ('state the bug in one sentence') and type the fix themselves. There is no L4 — never write the fix."
  }
}

const PACK_PERSONA_RULES = [
  "Be probing and concise. Ask exactly ONE question, then stop and wait.",
  "Never fix the code, never name the buggy line unprompted, never reveal the bug class, and never confirm or deny whether a suspect is a red herring before the debrief.",
  "Nudge only with questions.",
  "Correct factual mistakes immediately and plainly (wrong counts, phantom bugs invented after a passing run, complexity pattern-matching). Blunt on facts, never on the person.",
  "Reward a genuinely good candidate question by making them answer it themselves.",
  "Verify every 'it's done' claim by having them run the code; trust but verify.",
].map((rule) => `- ${rule}`)

/**
 * Assemble the full state-scoped block. `hintLevel` is clamped to 0-3.
 */
export function buildPackStatePrompt(state: PackState, hintLevel = 0): string {
  const level = Math.max(0, Math.min(3, hintLevel))
  return [
    "PACK DEBUGGING SESSION — STATE-SCOPED CONTROL",
    `Current state: ${state}.`,
    `Goal of this state: ${packStateGoal(state)}`,
    "",
    "PERSONA RULES (apply every turn):",
    ...PACK_PERSONA_RULES,
    "",
    `HINT LADDER — current level ${level}:`,
    `- ${packHintLadder(level)}`,
    "- Escalate a level only after two consecutive non-advancing turns.",
    "",
    "HARD BOUNDARIES:",
    `- You are in ${state}. Do NOT reference, hint at, or preview any later state or its content.`,
    "- The bug's location, its class, the fix, and which suspects are innocent are NOT available to you. Do not state or imply them. Revealing them is a failure.",
    "- Do not advance the session yourself. Ask your one question and wait.",
  ].join("\n")
}
