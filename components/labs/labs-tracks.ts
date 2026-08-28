/**
 * The Labs hub's single source of truth: one entry per lab family.
 *
 * The header's "Labs" button used to route straight to `/labs`. It now opens a picker, because Labs
 * is two different things wearing one word: a decomposition lab is one underspecified problem in a
 * sitting, and a Sprint workbook is one codebase across ten sprints. Offering the choice is the same
 * move `/interview` and `/learn` already make for their multi-track hubs, so a user does not have to
 * learn a third idiom.
 *
 * Deliberately a `.ts` module with no JSX and no heavy imports: `components/header.tsx` pulls this in
 * on every page, so it must stay as light as `components/interview/interview-tracks.ts` — no scenario
 * registries, no client-only code. Icons are component references, not JSX, which is why importing
 * them here is safe (same as the interview registry does).
 */

import { Layers, Workflow, type LucideIcon } from "lucide-react"

export type LabsTrackId = "decomposition" | "sprint"

export interface LabsTrack {
  id: LabsTrackId
  /** Full name, shown on the picker card. */
  label: string
  /** What this lab family actually is, in a candidate's words. */
  blurb: string
  /** The shape of the work, shown as chips on the card. */
  loop: string[]
  /** Where the card goes. A real address, so middle-click and cmd-click work. */
  href: string
  Icon: LucideIcon
  /**
   * When true, the track appears only once `SPRINT_LABS_ENABLED` is confirmed on (client-probed via
   * `useSprintLabsEnabled`). Off/unknown hides it, so the not-yet-launched surface never leaks into
   * the nav before the owner flips the flag.
   */
  requiresSprintLabs?: boolean
}

export const LABS_TRACKS: LabsTrack[] = [
  {
    id: "decomposition",
    label: "Decomposition",
    blurb:
      "One underspecified problem, one sitting. Scope it, commit to a design, then build on a real multi-file codebase until the tests pass. The round Palantir FDSE and Stripe interviews actually run.",
    // The five milestones, pinned by lib/labs/__tests__/case-labs-registry.test.ts.
    loop: ["Clarify", "Decompose", "Design", "Build", "Review"],
    href: "/labs",
    Icon: Layers,
  },
  {
    id: "sprint",
    label: "Sprint",
    blurb:
      "Ten sprints on one growing codebase. The repo remembers what you did, and sprint 9 breaks the code you wrote in sprint 4. The long game on one system.",
    loop: ["Ten sprints", "One codebase", "It remembers"],
    // The flagship Meridian workbook. Its overview page is where the onboarding cinematic mounts, so
    // this row is the front door to "you're hired." fixture-demo stays reachable via /labs#sprint-labs.
    href: "/sprint-labs/meridian",
    Icon: Workflow,
    requiresSprintLabs: true,
  },
]

/** The Labs nav is current on both catalogs and every workbook/lab beneath them. */
export function labsNavIsActive(pathname: string): boolean {
  return pathname.startsWith("/labs") || pathname.startsWith("/sprint-labs")
}

/** The tracks to show given the client-probed flag. `null`/`false` fail closed: Sprint stays hidden. */
export function visibleLabsTracks(sprintLabsEnabled: boolean | null): LabsTrack[] {
  return LABS_TRACKS.filter((track) => !track.requiresSprintLabs || sprintLabsEnabled === true)
}
