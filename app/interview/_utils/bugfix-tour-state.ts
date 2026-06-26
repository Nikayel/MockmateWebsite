import type { Profile } from "@/lib/types"

export const BUGFIX_TOUR_VERSION = "bugfix-tour-v1"
export const BUGFIX_TOUR_STORAGE_KEY = "codesparring:bugfix-tour:v1"

export type BugfixTourStatus = "completed" | "skipped"
export type TourPanel = "problem" | "editor" | "chat"

export interface StoredBugfixTourState {
  status: BugfixTourStatus
  updatedAt: string
  version: typeof BUGFIX_TOUR_VERSION
}

export interface BugfixTourStep {
  id: "incident-report" | "workspace-files" | "hypothesis" | "run-tests" | "ai-partner"
  target: string
  panel: TourPanel
  title: string
  body: string
  action: string
}

export const TOUR_STEPS: BugfixTourStep[] = [
  {
    id: "incident-report",
    target: "incident-report",
    panel: "problem",
    title: "Start with the incident",
    body: "Read the report like a production ticket. Look for symptoms, affected behavior, and what fixed should mean.",
    action: "Read the report, then go to the workspace files.",
  },
  {
    id: "workspace-files",
    target: "workspace-files",
    panel: "editor",
    title: "Inspect the codebase",
    body: "Bugfix scenarios include docs, source, helpers, and tests. Start with docs and visible tests before changing code.",
    action: "Open a docs or test file.",
  },
  {
    id: "hypothesis",
    target: "hypothesis",
    panel: "problem",
    title: "Write your hypothesis",
    body: "Before editing, write what you think is causing the bug. The AI interviewer can use this to ask better follow-ups.",
    action: "Type a short hypothesis and click Save hypothesis.",
  },
  {
    id: "run-tests",
    target: "run-tests",
    panel: "editor",
    title: "Reproduce and verify",
    body: "Run tests before and after your fix. Passing tests matter, but your investigation and explanation matter too.",
    action: "Click Run Tests to see the current failure.",
  },
  {
    id: "ai-partner",
    target: "ai-partner",
    panel: "editor",
    title: "Use AI like a debugging partner",
    body: "Ask for help interpreting files or test output. When your fix is verified, save root cause and prevention, then submit.",
    action: "Ask a debugging question or finish the tour.",
  },
]

export function readStoredTourState(): StoredBugfixTourState | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(BUGFIX_TOUR_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredBugfixTourState>
    if (
      parsed.version === BUGFIX_TOUR_VERSION &&
      (parsed.status === "completed" || parsed.status === "skipped") &&
      typeof parsed.updatedAt === "string"
    ) {
      return parsed as StoredBugfixTourState
    }
  } catch {
    return null
  }

  return null
}

export function writeStoredTourState(status: BugfixTourStatus) {
  if (typeof window === "undefined") return

  const nextState: StoredBugfixTourState = {
    status,
    updatedAt: new Date().toISOString(),
    version: BUGFIX_TOUR_VERSION,
  }

  window.localStorage.setItem(BUGFIX_TOUR_STORAGE_KEY, JSON.stringify(nextState))
}

export function profileHasCurrentTourState(profile: Profile | null | undefined) {
  return (
    profile?.bugfix_tour_version === BUGFIX_TOUR_VERSION &&
    (profile.bugfix_tour_completed || profile.bugfix_tour_skipped)
  )
}
