/**
 * Case Labs — shared domain types.
 *
 * A Case Lab is a multi-milestone, company-framed engineering exercise:
 * Clarify -> Decompose -> Design -> Build (multi-file codebase drop) -> Review.
 * The Build milestone always reuses an existing CODEBASE scenario
 * (bugfix / add-functionality / system-design) — never a from-scratch DSA task.
 *
 * Spec: docs/case-labs/CASE_LABS.md (§7 milestones, §9 data model).
 */

import type { DifficultyLevel, WorkspaceScenarioLanguage } from "../scenarios/types"
import type { InterviewSession } from "../types"

// ============================================================
// Lab definition (authored content)
// ============================================================

export type MilestoneKind = "clarify" | "decompose" | "design" | "build" | "review"

/** The Build milestone may only reuse a multi-file codebase scenario — never DSA. */
export type BuildScenarioType = "bugfix" | "add-functionality" | "system-design"

/**
 * §7.4 Onsite-only Build curveball: a mid-build constraint change ("GPS feed is
 * now delayed 30s — how does your design hold up?") injected partway through the
 * Build milestone to pressure-test the design. Practice mode never surfaces it.
 */
export interface CaseLabCurveball {
  /** Short label shown on the callout, e.g. "Curveball: stale GPS". */
  title: string
  /** The constraint change posed to the candidate. */
  prompt: string
}

/**
 * The problem brief shown before and during the lab — the context a candidate
 * needs to understand WHAT they're solving. Without it the milestones ("Clarify
 * what 'best' means") have nothing to anchor to.
 */
export interface CaseLabBrief {
  /** The scenario set-up: the system, who runs it, and where it hurts today. */
  situation: string
  /** The candidate's mandate — what they're being asked to deliver across the lab. */
  task: string
}

/**
 * Per-round instruction shown on the station itself (not just the intro).
 *
 * Each Case Lab round mirrors a distinct interview round. Without this, the
 * station only carries a one-line label and the candidate never learns what the
 * round actually tests, how to work it, or the classic trap. `interviewerPrompt`
 * is the question the interviewer poses for THIS round — surfaced persistently on
 * the practice surface so the candidate always has the prompt in front of them,
 * not buried on the start screen.
 */
export interface MilestoneGuidance {
  /**
   * The interviewer's spoken prompt for this round — the question the candidate
   * works against. Shown persistently at the top of the station.
   */
  interviewerPrompt: string
  /** One line on what this round is really scoring at this company. */
  whatItTests: string
  /** Ordered "how to work this round" moves. */
  howToApproach: string[]
  /** Concrete markers of a strong answer — the bar to clear. */
  whatGoodLooksLike: string[]
  /** The single classic mistake that sinks candidates in this round. */
  commonTrap: string
}

export interface CaseLabMilestone {
  kind: MilestoneKind
  title: string
  /** P3: the one-line "why this milestone matters" shown on the rail. */
  purpose: string
  /**
   * The real, named company interview round this milestone maps to (PF-09), so
   * a candidate who read "prep the Decomposition round" can connect it. Several
   * milestones may share one round (Clarify + Decompose + Design all serve the
   * Decomposition round). Optional; omit for a generic lab.
   */
  mapsToRound?: string
  /** Per-round instruction shown on the station (interviewer prompt + how-to). */
  guidance?: MilestoneGuidance
  /** P2: pre-filled example so the user never faces a blank wall. */
  ghostExample?: unknown
  /** P1: open by default — milestones are soft-gated unless explicitly required. */
  required?: boolean
}

export interface CaseLab {
  id: string
  title: string
  /** Lowercase company slug, e.g. "palantir". */
  company: string
  /** Role the lab mirrors, e.g. "FDSE". */
  role: string
  difficulty: DifficultyLevel
  estimatedMinutes: number
  /** The problem context shown on the intro and persistently during the lab. */
  brief: CaseLabBrief
  /** P6: copy explaining why this maps to the company's real interview bar. */
  whyThisCompany: string
  /** Skills surfaced for browse filtering. */
  skills: string[]
  milestones: CaseLabMilestone[]
  /** Build milestone reuses an existing multi-file codebase scenario by id. */
  buildScenarioId: string
  buildScenarioType: BuildScenarioType
  /** §7.4 Onsite-only: a mid-build constraint change. Omit to skip the curveball. */
  buildCurveball?: CaseLabCurveball
}

// ============================================================
// Milestone answers (user inputs, §7)
// ============================================================

/** §7.1 Clarify — one row per ambiguity dimension. */
export interface ClarifyAnswer {
  dimension: string
  question: string
  assumption: string
}

export interface DecomposeEntity {
  name: string
  /** One-line description of the entity's role in the system. */
  role: string
}

export interface StateTransition {
  from: string
  to: string
  /** The event/trigger that causes the transition. */
  on: string
}

export interface StateMachine {
  /** The entity this state machine describes. */
  entity: string
  states: string[]
  transitions: StateTransition[]
}

/** §7.2 Decompose — legacy workflow, core entities, one state machine. */
export interface DecomposeAnswer {
  workflow: string[]
  entities: DecomposeEntity[]
  stateMachine?: StateMachine
}

export interface ApiField {
  name: string
  type: string
}

export interface ApiContract {
  /** Endpoint path or function signature name. */
  name: string
  inputs: ApiField[]
  outputs: ApiField[]
}

export interface DesignTradeoff {
  decision: string
  optionA: string
  optionB: string
  choice: string
  why: string
}

/** §7.3 Design — API contract, tradeoff table, ranking/fallback decision. */
export interface DesignAnswer {
  api: ApiContract
  tradeoffs: DesignTradeoff[]
  /** Ranking / fallback decision. */
  fallback: string
}

export interface BuildTestResult {
  name: string
  passed: boolean
  message?: string
}

/** §7.4 Build — reuses the workspace editor + /api/execute surface. */
export interface BuildAnswer {
  touchedFiles: string[]
  code: string
  language: WorkspaceScenarioLanguage
  testResults: BuildTestResult[]
}

export type CaseLabRubricDimension =
  | "handlingAmbiguity"
  | "decomposition"
  | "design"
  | "codeCorrectness"
  | "communication"

export type SelfScores = Record<CaseLabRubricDimension, number>

/** §7.5 Review — self-grade rubric + AI structured feedback. */
export interface ReviewAnswer {
  selfScores: Partial<SelfScores>
  /** Reuses the existing feedback pipeline output shape (InterviewSession). */
  aiFeedback?: NonNullable<InterviewSession["structured_feedback"]>
}

export interface CaseLabAnswers {
  clarify?: ClarifyAnswer[]
  decompose?: DecomposeAnswer
  design?: DesignAnswer
  build?: BuildAnswer
  review?: ReviewAnswer
}

// ============================================================
// Run (per-user, resumable — §9.2)
// ============================================================

export type CaseLabMode = "practice" | "onsite"
export type CaseLabRunStatus = "in_progress" | "completed" | "abandoned"
export type MilestoneStatus = "locked" | "active" | "done"

export type MilestoneStatusMap = Record<MilestoneKind, MilestoneStatus>

export interface CaseLabRun {
  id: string
  userId: string
  caseLabId: string
  mode: CaseLabMode
  status: CaseLabRunStatus
  currentMilestone: MilestoneKind
  /** ISO timestamps. */
  startedAt: string
  updatedAt: string
  completedAt?: string
  answers: CaseLabAnswers
  milestoneStatus: MilestoneStatusMap
}
