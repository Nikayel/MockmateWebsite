/**
 * The decisions `/interview` makes before it renders anything: whether the page is about to be
 * taken over by a session resume, which problems belong to the addressed track, and how far
 * through them the user is.
 *
 * They live outside `ScenarioBrowser.tsx` because they are the parts worth asserting directly.
 * The resume rule especially: it has to mirror `useSessionReopen`'s branches exactly, and a unit
 * test against the same param combinations is the only thing that keeps the two from drifting.
 */

import type { Scenario, ScenarioType } from "@/lib/scenarios/types"

import { INTERVIEW_TRACK_PARAM, type InterviewTrack } from "./interview-tracks"

/**
 * The read side of a query string. Both `URLSearchParams` and Next's `ReadonlyURLSearchParams`
 * satisfy it, so the rules below can be exercised without a router.
 */
export interface QueryParamReader {
  get(name: string): string | null
}

/**
 * True when `useSessionReopen` is about to hide the browser and drop the user into a session.
 *
 * `/interview` leaves `showScenarioBrowser` true while that hook resolves, so without this the
 * track picker flashes on screen for a moment before the user is thrown into the interview they
 * deep-linked to.
 *
 * Mirrors the two branches in `app/interview/_hooks/useSessionReopen.ts` and is deliberately no
 * wider than them. A bare `?scenario=` matches neither branch and nothing else downstream picks
 * it up, so treating it as a resume would replace the picker with a loading state that never
 * resolves. `postInterview` only ever rides along with a session id, so it is not a trigger of
 * its own either.
 */
export function willResumeExistingSession(params: QueryParamReader | null | undefined): boolean {
  if (!params) return false
  if (!params.get("scenario")) return false
  // Case 1: reopening a saved session, which needs both ids.
  if (params.get("session")) return true
  // Case 2: a fresh run launched from the roadmap or the practice queue.
  return params.get("roadmap") === "true" || params.get("practice") === "true"
}

/**
 * True when the address names interview work: a track to browse, a session to reopen, or a
 * scenario to run. Checked on the raw params, not the resolved track, so `?track=junk` still
 * counts as asking for a track and lands on the picker the way `findInterviewTrack` intends.
 *
 * Two callers deliberately share this one definition. `useSessionReopen` bounces a signed-out
 * visitor with a spent trial to sign-in only when it is true (they are trying to open something
 * the trial no longer covers), and the roadmap pitch below shows only when it is false, so the
 * two can never disagree about what a bare landing is.
 */
export function requestsInterviewWork(params: QueryParamReader | null | undefined): boolean {
  if (!params) return false
  return Boolean(
    params.get(INTERVIEW_TRACK_PARAM) || params.get("session") || params.get("scenario")
  )
}

/**
 * True when `/interview` should open on the roadmap pitch instead of the track cards.
 *
 * `pitchEligible` is the page's call, not this module's: signed out AND no live guest trial.
 * A fresh-trial guest is deliberately NOT eligible; they land on the track cards and run their
 * DSA or bugfix session exactly as before, scores still waiting behind sign-up. The pitch's
 * audience is the visitor whose trial is already spent, for whom the cards would only lead to
 * a login wall anyway. The resume notice still takes precedence in `ScenarioBrowser`; that
 * ordering is safe by construction, because a resume needs `?scenario=` and the pitch needs
 * its absence.
 */
export function showsRoadmapPitch(
  params: QueryParamReader | null | undefined,
  pitchEligible: boolean
): boolean {
  return pitchEligible && !requestsInterviewWork(params)
}

/**
 * The problems a track owns, in the order they were handed in.
 *
 * Applied on top of the filter results so a track can never show another track's problems, no
 * matter what the shared filter store happens to hold.
 */
export function scenariosInTrack<T extends { type: ScenarioType }>(
  track: InterviewTrack,
  list: readonly T[]
): T[] {
  return list.filter((item) => track.types.includes(item.type))
}

export interface TrackProgress {
  /** Every problem the track owns, ignoring filters. */
  total: number
  /** How many of those the user has finished. */
  completed: number
}

/**
 * How big a track is and how much of it is done.
 *
 * Counted from the registry rather than stored anywhere, because this number is shown to the user
 * as a promise about how much practice is waiting and a hardcoded one is wrong the day a scenario
 * is added. Counts the whole track, not the filtered view, so the header stays a fact about the
 * track while the filter bar reports the search.
 */
export function trackProgress(
  track: InterviewTrack,
  catalog: readonly Scenario[],
  completedProblemIds: readonly string[]
): TrackProgress {
  const owned = scenariosInTrack(track, catalog)
  const completed = new Set(completedProblemIds)
  return {
    total: owned.length,
    completed: owned.filter((scenario) => completed.has(scenario.id)).length,
  }
}
