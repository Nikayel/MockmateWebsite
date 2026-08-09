import { describe, expect, it } from "vitest"

import { scenarios } from "@/lib/scenarios"
import type { ScenarioType } from "@/lib/scenarios/types"

import {
  INTERVIEW_TRACKS,
  UNTRACKED_SCENARIO_TYPES,
  findInterviewTrack,
  interviewTrackPath,
  trackOwnsScenarioType,
} from "../interview-tracks"

describe("interview track registry", () => {
  it("gives every track a distinct id", () => {
    const ids = INTERVIEW_TRACKS.map((track) => track.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("never lets two tracks claim the same scenario type", () => {
    const claimed = INTERVIEW_TRACKS.flatMap((track) => track.types)
    expect(new Set(claimed).size).toBe(claimed.length)
  })

  /**
   * The reachability guard, and the reason this file exists.
   *
   * A track owning no scenarios renders an empty browse surface, and a scenario type owned by no
   * track disappears from the product entirely. Both have happened here before, so both fail here
   * now rather than in front of a user.
   */
  it("gives every track at least one scenario", () => {
    for (const track of INTERVIEW_TRACKS) {
      const count = scenarios.filter((scenario) => track.types.includes(scenario.type)).length
      expect(count, `track "${track.id}" has no scenarios`).toBeGreaterThan(0)
    }
  })

  it("leaves no scenario type unreachable", () => {
    const owned = new Set(INTERVIEW_TRACKS.flatMap((track) => track.types))
    const present = new Set<ScenarioType>(scenarios.map((scenario) => scenario.type))

    for (const type of present) {
      const reachable = owned.has(type) || type in UNTRACKED_SCENARIO_TYPES
      expect(
        reachable,
        `scenario type "${type}" is owned by no track and is not listed in UNTRACKED_SCENARIO_TYPES. ` +
          `Either give it a track or record where it lives instead.`
      ).toBe(true)
    }
  })

  it("does not declare a type untracked while a track still owns it", () => {
    const owned = new Set(INTERVIEW_TRACKS.flatMap((track) => track.types))
    for (const type of Object.keys(UNTRACKED_SCENARIO_TYPES)) {
      expect(owned.has(type as ScenarioType), `"${type}" is both tracked and untracked`).toBe(false)
    }
  })

  /**
   * Every chip a track advertises must be able to match something. The old browser offered
   * "Optimization" and "Security" chips against zero scenarios, so the only thing clicking them
   * could do was empty the list.
   */
  it("advertises no scenario type that has no scenarios", () => {
    const present = new Set(scenarios.map((scenario) => scenario.type))
    for (const track of INTERVIEW_TRACKS) {
      for (const type of track.types) {
        expect(
          present.has(type),
          `track "${track.id}" advertises "${type}", which has 0 scenarios`
        ).toBe(true)
      }
    }
  })
})

describe("findInterviewTrack", () => {
  it("resolves a known id", () => {
    expect(findInterviewTrack("dsa")?.id).toBe("dsa")
    expect(findInterviewTrack("debugging")?.id).toBe("debugging")
  })

  it("returns null rather than defaulting, so junk lands on the picker", () => {
    expect(findInterviewTrack(null)).toBeNull()
    expect(findInterviewTrack(undefined)).toBeNull()
    expect(findInterviewTrack("")).toBeNull()
    expect(findInterviewTrack("DSA")).toBeNull()
    expect(findInterviewTrack("system-design")).toBeNull()
  })
})

describe("interviewTrackPath", () => {
  it("addresses the track by query param", () => {
    expect(interviewTrackPath("dsa")).toBe("/interview?track=dsa")
    expect(interviewTrackPath("debugging")).toBe("/interview?track=debugging")
  })

  it("round-trips through findInterviewTrack", () => {
    for (const track of INTERVIEW_TRACKS) {
      const param = new URL(interviewTrackPath(track.id), "https://example.com").searchParams.get(
        "track"
      )
      expect(findInterviewTrack(param)?.id).toBe(track.id)
    }
  })
})

describe("trackOwnsScenarioType", () => {
  it("keeps DSA and debugging disjoint", () => {
    const dsa = findInterviewTrack("dsa")!
    const debugging = findInterviewTrack("debugging")!

    expect(trackOwnsScenarioType(dsa, "dsa")).toBe(true)
    expect(trackOwnsScenarioType(dsa, "bugfix")).toBe(false)
    expect(trackOwnsScenarioType(debugging, "bugfix")).toBe(true)
    expect(trackOwnsScenarioType(debugging, "add-functionality")).toBe(true)
    expect(trackOwnsScenarioType(debugging, "dsa")).toBe(false)
  })
})
