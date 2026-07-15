/**
 * Pack interview state machine (PLAN.md Sprint 1 item 3; INTERVIEWER_SPEC.md state
 * machine). One active state, transitions ONLY forward, never skipping. This module is
 * the single transition authority — the engine never advances on a candidate's claim
 * alone.
 *
 * Three exit kinds, exactly as the spec distinguishes them:
 *  - deterministic: verified by engine code from a recorded run event (REPRODUCE saw
 *    the diff; FIX matches expected_output; PHASE2 matches expected_output_v2).
 *  - judgment: proposed by the interviewer model via a structured advance signal that
 *    carries quoted evidence (OPENING, SYMPTOM, SCOPE, LOCALIZE, COMPLEXITY).
 *  - trigger: SCALE -> DEBRIEF only on the literal phrase "debrief me".
 *
 * Pure + serializable so it can be persisted server-side on
 * InterviewSession.session_state.pack_progress and never trusted from the client.
 */

export type PackState =
  | "OPENING"
  | "REPRODUCE"
  | "SYMPTOM"
  | "SCOPE"
  | "LOCALIZE"
  | "FIX"
  | "COMPLEXITY"
  | "PHASE2"
  | "SCALE"
  | "DEBRIEF"

export const PACK_STATES: readonly PackState[] = [
  "OPENING",
  "REPRODUCE",
  "SYMPTOM",
  "SCOPE",
  "LOCALIZE",
  "FIX",
  "COMPLEXITY",
  "PHASE2",
  "SCALE",
  "DEBRIEF",
] as const

export type PackExitKind = "judgment" | "deterministic" | "trigger" | "terminal"

interface PackStateSpec {
  next: PackState | null
  exitKind: PackExitKind
  /** L0 hint: a one-line restatement of this state's goal (INTERVIEWER_SPEC.md). */
  goal: string
}

const STATE_SPECS: Record<PackState, PackStateSpec> = {
  OPENING: {
    next: "REPRODUCE",
    exitKind: "judgment",
    goal: "Post the filenames, the task in 2-3 lines, that the output is wrong, and ask how they want to start.",
  },
  REPRODUCE: {
    next: "SYMPTOM",
    exitKind: "deterministic",
    goal: "Have the candidate run the command and diff the actual output against the oracle.",
  },
  SYMPTOM: {
    next: "SCOPE",
    exitKind: "judgment",
    goal: "Get one precise sentence describing the wrong behavior, grounded in the raw input data, before any code is opened.",
  },
  SCOPE: {
    next: "LOCALIZE",
    exitKind: "judgment",
    goal: "Make them use the CORRECT output to rule code out, then follow the one wrong output backwards to the function that filled it.",
  },
  LOCALIZE: {
    next: "FIX",
    exitKind: "judgment",
    goal: "Make them hand-trace the failing case until the false assumption in their trace is exposed.",
  },
  FIX: {
    next: "COMPLEXITY",
    exitKind: "deterministic",
    goal: "Candidate edits; the engine diffs the run against expected_output. Character-exact match required.",
  },
  COMPLEXITY: {
    next: "PHASE2",
    exitKind: "judgment",
    goal: "Get end-to-end time/space, making them find the dominant cost themselves rather than pattern-matching.",
  },
  PHASE2: {
    next: "SCALE",
    exitKind: "deterministic",
    goal: "Apply the spec+fixture patch, show the current code silently drops the new data, verify the fix against expected_output_v2.",
  },
  SCALE: {
    next: "DEBRIEF",
    exitKind: "trigger",
    goal: "Ask one tradeoff question (unbounded dedup set, sort vs streaming, malformed-input policy).",
  },
  DEBRIEF: {
    next: null,
    exitKind: "terminal",
    goal: "Deliver intended bug vs their actual path, what they did well, where signal was lost, and exactly one drill.",
  },
}

export interface PackTransition {
  from: PackState
  to: PackState
  kind: PackExitKind
  evidence?: string
}

export interface PackProgress {
  version: 1
  state: PackState
  /** Current hint-ladder level (0-3); reset to 0 on every advance. */
  hintLevel: number
  /** Consecutive candidate turns in this state that did not advance it. */
  nonAdvancingTurns: number
  history: PackTransition[]
}

/** A recorded, server-verified execution result (deterministic exits key off this). */
export interface PackRunEvent {
  kind: "run"
  /** Did captured stdout match expected_output (v1) byte-for-byte? */
  matchedOracle: boolean
  /** Did captured stdout match expected_output_v2 byte-for-byte? (PHASE2 only.) */
  matchedOracleV2?: boolean
}

/** The interviewer model's structured advance signal for a judgment exit. */
export interface PackAdvanceSignal {
  kind: "advance"
  /** Quoted candidate evidence justifying the advance (recorded in history). */
  evidence: string
}

/** The candidate's debrief request; only the literal phrase unlocks DEBRIEF. */
export interface PackDebriefTrigger {
  kind: "debrief-trigger"
  phrase: string
}

export type PackInput = PackRunEvent | PackAdvanceSignal | PackDebriefTrigger

export interface PackTransitionResult {
  progress: PackProgress
  advanced: boolean
  from: PackState
  to: PackState
  reason: string
}

export function initPackProgress(): PackProgress {
  return { version: 1, state: "OPENING", hintLevel: 0, nonAdvancingTurns: 0, history: [] }
}

export function packStateGoal(state: PackState): string {
  return STATE_SPECS[state].goal
}

export function packStateIndex(state: PackState): number {
  return PACK_STATES.indexOf(state)
}

/** Strict literal trigger: the message must be exactly "debrief me" (± trailing punctuation). */
export function isDebriefTriggerPhrase(phrase: string): boolean {
  return /^\s*debrief me\s*[.!]?\s*$/i.test(phrase)
}

/**
 * The phase-2 release endpoint may hand over the sealed spec/fixture patch only once
 * the machine has ENTERED phase 2 (state PHASE2 or later, since it is forward-only).
 */
export function phase2Unlocked(progress: PackProgress): boolean {
  return packStateIndex(progress.state) >= packStateIndex("PHASE2")
}

/** Solution.md may be injected into the debrief grader only once DEBRIEF is reached. */
export function debriefUnlocked(progress: PackProgress): boolean {
  return progress.state === "DEBRIEF"
}

function stay(progress: PackProgress, reason: string): PackTransitionResult {
  const next: PackProgress = {
    ...progress,
    nonAdvancingTurns: progress.nonAdvancingTurns + 1,
  }
  return { progress: next, advanced: false, from: progress.state, to: progress.state, reason }
}

function move(
  progress: PackProgress,
  to: PackState,
  kind: PackExitKind,
  reason: string,
  evidence?: string
): PackTransitionResult {
  const transition: PackTransition = { from: progress.state, to, kind, evidence }
  const next: PackProgress = {
    ...progress,
    state: to,
    hintLevel: 0,
    nonAdvancingTurns: 0,
    history: [...progress.history, transition],
  }
  return { progress: next, advanced: true, from: progress.state, to, reason }
}

/**
 * Advance the machine by exactly one step if the input satisfies the CURRENT state's
 * exit condition; otherwise stay (and count a non-advancing turn). Never skips.
 */
export function advancePackState(progress: PackProgress, input: PackInput): PackTransitionResult {
  const spec = STATE_SPECS[progress.state]
  if (spec.exitKind === "terminal" || spec.next === null) {
    return stay(progress, "DEBRIEF is terminal.")
  }

  switch (spec.exitKind) {
    case "judgment":
      if (input.kind === "advance") {
        return move(
          progress,
          spec.next,
          "judgment",
          "Interviewer advanced on quoted evidence.",
          input.evidence
        )
      }
      return stay(progress, "Judgment exit requires an interviewer advance signal.")

    case "deterministic": {
      if (input.kind !== "run") {
        return stay(progress, "Deterministic exit requires a verified run event.")
      }
      if (progress.state === "REPRODUCE") {
        return input.matchedOracle === false
          ? move(progress, spec.next, "deterministic", "Candidate reproduced the wrong output.")
          : stay(progress, "Run matched the oracle — the failure was not reproduced yet.")
      }
      if (progress.state === "FIX") {
        return input.matchedOracle === true
          ? move(
              progress,
              spec.next,
              "deterministic",
              "Run matches expected_output character-exact."
            )
          : stay(progress, "Run still differs from expected_output.")
      }
      if (progress.state === "PHASE2") {
        return input.matchedOracleV2 === true
          ? move(
              progress,
              spec.next,
              "deterministic",
              "Run matches expected_output_v2 character-exact."
            )
          : stay(progress, "Run does not match expected_output_v2 yet.")
      }
      return stay(progress, "No deterministic rule for this state.")
    }

    case "trigger":
      if (input.kind === "debrief-trigger" && isDebriefTriggerPhrase(input.phrase)) {
        return move(progress, spec.next, "trigger", "Literal debrief trigger received.")
      }
      return stay(progress, "DEBRIEF requires the literal phrase 'debrief me'.")

    default:
      return stay(progress, "Unknown exit kind.")
  }
}
