/**
 * Guided Bug-Fix Lab
 *
 * Optional, content-rich layer that turns a multi-file `BugFixScenario` into a
 * sequential, milestone-gated lab (e.g. the BookClub reading-tracker lab). A
 * scenario opts in by setting `guidedLab` on it; absent the field, the scenario
 * behaves exactly as a normal bugfix interview.
 *
 * Milestones unlock in order. A code-fix milestone is "done" once a set of test
 * SUITES (matched by the workspace runner's `suite` label) all pass — that is how
 * a second bug stays hidden until the first one is actually fixed and verified.
 */

/** A single teaching/instruction unit inside a milestone. */
export type GuidedLabBlock =
  | {
      kind: "instruction"
      id: string
      body: string
      /**
       * When true, this is a "deliberate slow-down" step (find the bug yourself).
       * The AI partner is told to withhold the bug location/root cause/patch here.
       */
      aiRestraint?: boolean
    }
  | {
      kind: "knowledge-card"
      id: string
      title: string
      body: string
    }
  | {
      kind: "quiz"
      id: string
      question: string
      options: { text: string; rationale: string }[]
      correctIndex: number
      explanation: string
    }
  | {
      kind: "checkpoint"
      id: string
      title: string
      items: string[]
    }

/** What advances the lab from one milestone to the next. */
export type GuidedLabGate =
  | {
      kind: "tests-pass"
      /** Workspace runner `suite` labels that must all be green (e.g. "visible streak"). */
      testSuites: string[]
    }
  | { kind: "manual-ack" }

export interface GuidedLabMilestone {
  id: string
  title: string
  /** Short framing for the milestone shown above its content. */
  purpose: string
  /** Optional bug identifier for code-fix milestones, e.g. "bug-1-streak". */
  bugId?: string
  blocks: GuidedLabBlock[]
  /** Condition that completes this milestone and unlocks dependents. */
  gate: GuidedLabGate
  /** Milestone ids that must be `done` before this one becomes active. */
  dependsOn?: string[]
  /** Test suites to surface in the test panel once this milestone is active. */
  revealTestSuites?: string[]
}

export interface GuidedLabConfig {
  version: "bookclub-guided-v1"
  milestones: GuidedLabMilestone[]
}

export type GuidedLabMilestoneStatus = "locked" | "active" | "done"

/** Per-run progress, persisted on `InterviewSession.session_state`. */
export interface GuidedLabProgress {
  version: "bookclub-guided-v1"
  currentMilestoneId: string
  milestoneStatus: Record<string, GuidedLabMilestoneStatus>
  activeBugId?: string
  quizAnswers: { quizId: string; selectedIndex: number }[]
  checkpointAcks: string[]
  updatedAt: string
}
