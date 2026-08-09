/**
 * The interview hub's single source of truth: one entry per practice track.
 *
 * `/interview` used to be a two-tab browser whose tab lived in component state, which made the
 * choice invisible in the URL, unshareable, and reset to "Debugging" on every reload even for the
 * overwhelming majority of users who come for DSA. A track is now an address (`/interview?track=dsa`)
 * and a page renders exactly one of them, so a session is unambiguously DSA work or debugging work
 * and never a blend of the two.
 *
 * The header picker, the on-page picker, and the browser all render from this list, so a new track
 * appears on every surface at once and the three can never drift apart. Same relationship
 * `components/learn/learn-tracks.tsx` has with the Learn surfaces.
 *
 * Deliberately a `.ts` module with no JSX: `components/header.tsx` imports it on every page, so it
 * must stay free of anything that would drag the multi-megabyte scenario registry into the client
 * bundle. That is also why a track carries no problem count. Counts are exact only if you read the
 * registry, so they are computed by the browser (which already loads it) rather than stored here
 * where they would rot.
 */

import { Bug, Cpu, type LucideIcon } from "lucide-react"

import type { ScenarioType } from "@/lib/scenarios/types"

export type InterviewTrackId = "dsa" | "debugging"

/** The query param that addresses a track. */
export const INTERVIEW_TRACK_PARAM = "track"

export interface InterviewTrack {
  id: InterviewTrackId
  /** Full name, used as the heading once the user is inside the track. */
  label: string
  /** Short name for tight spots (nav chips, breadcrumbs). */
  shortLabel: string
  /** What this interview round actually is, in a candidate's words. */
  blurb: string
  /** The shape of the round, shown as chips on the picker card. */
  loop: string[]
  /**
   * Scenario types this track owns. The browser filters the catalog by this, and the filter chips
   * are derived from it, so a type with no scenarios can never render a chip that matches nothing.
   */
  types: ScenarioType[]
  Icon: LucideIcon
}

export const INTERVIEW_TRACKS: InterviewTrack[] = [
  {
    id: "dsa",
    label: "Data Structures & Algorithms",
    shortLabel: "DSA",
    blurb:
      "The coding round. One problem, a blank editor, and an interviewer who expects you to think out loud before you type.",
    loop: ["Roadmap", "Patterns", "All problems"],
    types: ["dsa"],
    Icon: Cpu,
  },
  {
    id: "debugging",
    label: "Debugging",
    shortLabel: "Debugging",
    blurb:
      "The round that looks like the job. You are dropped into a codebase you did not write, with a symptom and no line number.",
    loop: ["Read the codebase", "Find the cause", "Ship the fix"],
    types: ["bugfix", "add-functionality"],
    Icon: Bug,
  },
]

/**
 * Scenario types no track owns, and where they live instead.
 *
 * This exists so `interview-tracks.test.ts` can tell a deliberate omission apart from a scenario
 * that quietly fell out of every browse surface. A type that is neither owned by a track nor listed
 * here fails that test rather than becoming unreachable in silence, which is exactly how the pack
 * scenarios went missing before.
 */
export const UNTRACKED_SCENARIO_TYPES: Record<string, string> = {
  // Design rounds are taught and drilled inside the System Design course, not browsed here.
  "system-design": "/learn/system-design",
}

/** The track's address. */
export function interviewTrackPath(id: InterviewTrackId): string {
  return `/interview?${INTERVIEW_TRACK_PARAM}=${id}`
}

/**
 * Resolve a raw `?track=` value to a track.
 *
 * Returns `null` for anything unrecognised, including absent, so a junk param lands the user on the
 * picker rather than on a silently-chosen default. Choosing for them is what the old tab bar did.
 */
export function findInterviewTrack(raw: string | null | undefined): InterviewTrack | null {
  if (!raw) return null
  return INTERVIEW_TRACKS.find((track) => track.id === raw) ?? null
}

/** True when this track is the one that owns the given scenario type. */
export function trackOwnsScenarioType(track: InterviewTrack, type: ScenarioType): boolean {
  return track.types.includes(type)
}
