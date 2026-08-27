import { describe, expect, it } from "vitest"

import { filterScenarios, scenarios } from "@/lib/scenarios"
import { useInterviewStore } from "@/lib/stores"

import {
  requestsInterviewWork,
  scenariosInTrack,
  showsRoadmapPitch,
  trackProgress,
  willResumeExistingSession,
} from "../interview-track-browsing"
import { findInterviewTrack } from "../interview-tracks"

const dsa = findInterviewTrack("dsa")!
const debugging = findInterviewTrack("debugging")!

const countOfType = (type: string) => scenarios.filter((scenario) => scenario.type === type).length

/**
 * These mirror the branches in `app/interview/_hooks/useSessionReopen.ts`. If that hook grows a
 * third takeover path, this block is where the two are supposed to be reconciled.
 */
describe("willResumeExistingSession", () => {
  it("treats a session id plus a scenario id as a resume", () => {
    expect(willResumeExistingSession(new URLSearchParams("session=s1&scenario=two-sum"))).toBe(true)
  })

  it("treats a roadmap or practice launch as a resume", () => {
    expect(willResumeExistingSession(new URLSearchParams("scenario=two-sum&roadmap=true"))).toBe(
      true
    )
    expect(willResumeExistingSession(new URLSearchParams("scenario=two-sum&practice=true"))).toBe(
      true
    )
  })

  /**
   * The regression this predicate exists to avoid in the other direction. A bare `?scenario=`
   * matches neither branch of `useSessionReopen` and nothing downstream picks it up, so calling it
   * a resume would leave the page on a loading state that never resolves.
   */
  it("does not treat a bare scenario id as a resume", () => {
    expect(willResumeExistingSession(new URLSearchParams("scenario=two-sum"))).toBe(false)
  })

  it("does not treat postInterview as a trigger of its own", () => {
    expect(willResumeExistingSession(new URLSearchParams("postInterview=true"))).toBe(false)
    expect(
      willResumeExistingSession(new URLSearchParams("scenario=two-sum&postInterview=true"))
    ).toBe(false)
    // It only ever rides along with a real session reopen, which is already a resume.
    expect(
      willResumeExistingSession(
        new URLSearchParams("session=s1&scenario=two-sum&postInterview=true")
      )
    ).toBe(true)
  })

  it("ignores a session id with no scenario to open", () => {
    expect(willResumeExistingSession(new URLSearchParams("session=s1"))).toBe(false)
  })

  it("reads the literal flag value, not merely its presence", () => {
    expect(willResumeExistingSession(new URLSearchParams("scenario=two-sum&roadmap=false"))).toBe(
      false
    )
    expect(willResumeExistingSession(new URLSearchParams("scenario=two-sum&practice=1"))).toBe(
      false
    )
  })

  it("leaves a plain track address on the picker", () => {
    expect(willResumeExistingSession(new URLSearchParams("track=dsa"))).toBe(false)
    expect(willResumeExistingSession(new URLSearchParams(""))).toBe(false)
    expect(willResumeExistingSession(null)).toBe(false)
    expect(willResumeExistingSession(undefined)).toBe(false)
  })
})

/**
 * Shared by `useSessionReopen` (may a spent-trial visitor stay, or do they get the sign-in
 * bounce?) and by `showsRoadmapPitch` below. One definition on purpose: the two callers must
 * never disagree about what a bare `/interview` address is.
 */
describe("requestsInterviewWork", () => {
  it("counts a named track, session, or scenario as asking for work", () => {
    expect(requestsInterviewWork(new URLSearchParams("track=dsa"))).toBe(true)
    expect(requestsInterviewWork(new URLSearchParams("session=s1"))).toBe(true)
    expect(requestsInterviewWork(new URLSearchParams("scenario=two-sum"))).toBe(true)
    expect(requestsInterviewWork(new URLSearchParams("session=s1&scenario=two-sum"))).toBe(true)
  })

  it("counts a junk track value too, since the param still asks for the picker", () => {
    expect(requestsInterviewWork(new URLSearchParams("track=not-a-track"))).toBe(true)
  })

  it("treats the bare address as asking for nothing", () => {
    expect(requestsInterviewWork(new URLSearchParams(""))).toBe(false)
    expect(requestsInterviewWork(null)).toBe(false)
    expect(requestsInterviewWork(undefined)).toBe(false)
  })

  it("ignores rider flags that name nothing on their own", () => {
    expect(requestsInterviewWork(new URLSearchParams("postInterview=true"))).toBe(false)
    expect(requestsInterviewWork(new URLSearchParams("roadmap=true"))).toBe(false)
    expect(requestsInterviewWork(new URLSearchParams("practice=true"))).toBe(false)
  })
})

/** The branch `ScenarioBrowser.renderUntracked` takes between the pitch and the track cards. */
describe("showsRoadmapPitch", () => {
  it("pitches the roadmap to a signed-out visitor on the bare address", () => {
    expect(showsRoadmapPitch(new URLSearchParams(""), true)).toBe(true)
    expect(showsRoadmapPitch(null, true)).toBe(true)
    expect(showsRoadmapPitch(undefined, true)).toBe(true)
  })

  it("keeps the track cards for signed-in users on the same address", () => {
    expect(showsRoadmapPitch(new URLSearchParams(""), false)).toBe(false)
    expect(showsRoadmapPitch(null, false)).toBe(false)
  })

  it("leaves a chosen track alone, junk values included", () => {
    expect(showsRoadmapPitch(new URLSearchParams("track=dsa"), true)).toBe(false)
    expect(showsRoadmapPitch(new URLSearchParams("track=debugging"), true)).toBe(false)
    // Unrecognised values land on the picker (findInterviewTrack's rule), never the pitch.
    expect(showsRoadmapPitch(new URLSearchParams("track=not-a-track"), true)).toBe(false)
  })

  /**
   * The resume notice outranks the pitch by ordering in `renderUntracked`, but the ordering is
   * also safe by construction: every combination the resume rule claims refuses the pitch, so a
   * reshuffle of the branches could not flash a sales pitch at someone opening their session.
   */
  it("never claims a combination the resume notice owns", () => {
    const resumes = [
      "session=s1&scenario=two-sum",
      "scenario=two-sum&roadmap=true",
      "scenario=two-sum&practice=true",
    ]
    for (const combo of resumes) {
      const params = new URLSearchParams(combo)
      expect(willResumeExistingSession(params)).toBe(true)
      expect(showsRoadmapPitch(params, true)).toBe(false)
    }
  })

  it("bypasses the pitch for a named scenario or session even when it is not a resume", () => {
    // These fall to the track cards exactly as they did before the pitch existed.
    expect(showsRoadmapPitch(new URLSearchParams("scenario=two-sum"), true)).toBe(false)
    expect(showsRoadmapPitch(new URLSearchParams("session=s1"), true)).toBe(false)
  })
})

describe("scenariosInTrack", () => {
  it("keeps only the types the track owns", () => {
    const dsaProblems = scenariosInTrack(dsa, scenarios)
    expect(dsaProblems.length).toBe(countOfType("dsa"))
    expect(dsaProblems.every((scenario) => scenario.type === "dsa")).toBe(true)

    const debuggingProblems = scenariosInTrack(debugging, scenarios)
    expect(debuggingProblems.length).toBe(countOfType("bugfix") + countOfType("add-functionality"))
    expect(
      debuggingProblems.every(
        (scenario) => scenario.type === "bugfix" || scenario.type === "add-functionality"
      )
    ).toBe(true)
  })

  it("never lets one track show another track's problems", () => {
    const dsaIds = new Set(scenariosInTrack(dsa, scenarios).map((scenario) => scenario.id))
    const overlap = scenariosInTrack(debugging, scenarios).filter((scenario) =>
      dsaIds.has(scenario.id)
    )
    expect(overlap).toEqual([])
  })

  it("shows system design in neither track, since it lives in the course now", () => {
    for (const track of [dsa, debugging]) {
      const designProblems = scenariosInTrack(track, scenarios).filter(
        (scenario) => scenario.type === "system-design"
      )
      expect(designProblems).toEqual([])
    }
  })

  it("preserves the order it was handed, so the caller's sort survives", () => {
    const reversed = [...scenarios].reverse()
    const filtered = scenariosInTrack(dsa, reversed)
    const expected = reversed.filter((scenario) => scenario.type === "dsa")
    expect(filtered.map((scenario) => scenario.id)).toEqual(expected.map((scenario) => scenario.id))
  })
})

/**
 * The store used to initialise `filterType: ["bugfix"]`, which was invisible to the user and only
 * survivable because the old tab bar cleared filters on its way to DSA. With the track chosen by
 * URL there is no such switch on arrival, so a preset type filter would intersect with `["dsa"]`
 * to nothing and open the DSA track on "No problems match your filters".
 */
describe("a freshly mounted track", () => {
  it("presets no type filter", () => {
    expect(useInterviewStore.getState().filterType).toEqual([])
  })

  it("shows every DSA problem when the user has touched nothing", () => {
    const { filterType, filterDifficulty, filterCompanies, searchQuery } =
      useInterviewStore.getState()
    const filtered = filterScenarios({
      type: filterType.length > 0 ? filterType : undefined,
      difficulty: filterDifficulty.length > 0 ? filterDifficulty : undefined,
      companies: filterCompanies.length > 0 ? filterCompanies : undefined,
      searchQuery: searchQuery || undefined,
    })

    const visible = scenariosInTrack(dsa, filtered)
    expect(visible.length).toBe(countOfType("dsa"))
    expect(visible.length).toBeGreaterThan(0)
  })

  it("shows every debugging problem when the user has touched nothing", () => {
    const visible = scenariosInTrack(debugging, filterScenarios({}))
    expect(visible.length).toBe(countOfType("bugfix") + countOfType("add-functionality"))
    expect(visible.length).toBeGreaterThan(0)
  })
})

describe("trackProgress", () => {
  it("counts the whole track, not the filtered view", () => {
    expect(trackProgress(dsa, scenarios, []).total).toBe(countOfType("dsa"))
    expect(trackProgress(debugging, scenarios, []).total).toBe(
      countOfType("bugfix") + countOfType("add-functionality")
    )
  })

  it("starts at zero solved", () => {
    expect(trackProgress(dsa, scenarios, []).completed).toBe(0)
  })

  it("counts only the completions that belong to this track", () => {
    const dsaId = scenarios.find((scenario) => scenario.type === "dsa")!.id
    const debuggingId = scenarios.find((scenario) => scenario.type === "bugfix")!.id

    expect(trackProgress(dsa, scenarios, [dsaId, debuggingId]).completed).toBe(1)
    expect(trackProgress(debugging, scenarios, [dsaId, debuggingId]).completed).toBe(1)
  })

  it("ignores ids that are no longer in the registry", () => {
    expect(trackProgress(dsa, scenarios, ["retired-problem"]).completed).toBe(0)
  })

  it("never counts a duplicate completion twice", () => {
    const dsaId = scenarios.find((scenario) => scenario.type === "dsa")!.id
    expect(trackProgress(dsa, scenarios, [dsaId, dsaId, dsaId]).completed).toBe(1)
  })
})
