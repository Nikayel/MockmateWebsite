/**
 * The Labs hub's single source of truth: one entry per lab family.
 *
 * The chooser presents two kinds of practice and links directly to the chosen experience.
 *
 * Deliberately a `.ts` module with no JSX and no heavy imports: `components/header.tsx` pulls this in
 * on every page for the active nav state. Icons are component references, not JSX.
 */

import { Layers, Workflow, type LucideIcon } from "lucide-react"

export type LabsTrackId = "decomposition" | "sprint"

export interface LabsTrack {
  id: LabsTrackId
  /** Full name, shown on the chooser card. */
  label: string
  /** Candidate-facing assignment name. */
  assignmentTitle: string
  /** Quiet lifecycle label shown beside the track name. */
  statusLabel: "Coming soon"
  /** What this lab family actually is, in a candidate's words. */
  blurb: string
  /** Commitment shown beside access terms on the chooser. */
  commitment: string
  /** The card's final action label. */
  actionLabel: string
  /** What a visitor can do before signing in. */
  accessNote: string
  /** Where the card goes. A real address, so middle-click and cmd-click work. */
  href: string
  Icon: LucideIcon
  /**
   * When true, the track appears only once `SPRINT_LABS_ENABLED` is confirmed on.
   * Off/unknown hides it from the chooser.
   */
  requiresSprintLabs?: boolean
}

export const LABS_TRACKS: LabsTrack[] = [
  {
    id: "decomposition",
    label: "Decomposition",
    assignmentTitle: "Solve the 911 Dispatch case",
    statusLabel: "Coming soon",
    blurb:
      "Scope an underspecified response problem, choose a ranking, and build it in a real codebase.",
    commitment: "60 minutes",
    actionLabel: "Start 911 Dispatch",
    accessNote: "Try without an account",
    // 911 Dispatch is the authored decomposition round. Keep the route test pinned to its registry id.
    href: "/labs/palantir-911-dispatch",
    Icon: Layers,
  },
  {
    id: "sprint",
    label: "Sprint",
    assignmentTitle: "Join Meridian for ten sprints",
    statusLabel: "Coming soon",
    blurb:
      "One evolving codebase across ten sprints. Ship tickets, then live with your earlier decisions.",
    commitment: "10 sprints · about 58 hours",
    actionLabel: "Enter Meridian",
    accessNote: "Sign in · sprint 1 free, later sprints Pro",
    // The flagship Meridian overview owns its Start/Resume action and onboarding cinematic.
    href: "/sprint-labs/meridian",
    Icon: Workflow,
    requiresSprintLabs: true,
  },
]

/** The Labs nav is current on the chooser, case labs and sprint workbooks. */
export function labsNavIsActive(pathname: string): boolean {
  return pathname.startsWith("/labs") || pathname.startsWith("/sprint-labs")
}

/** The tracks to show given the Sprint flag. `null`/`false` fail closed. */
export function visibleLabsTracks(sprintLabsEnabled: boolean | null): LabsTrack[] {
  return LABS_TRACKS.filter((track) => !track.requiresSprintLabs || sprintLabsEnabled === true)
}
