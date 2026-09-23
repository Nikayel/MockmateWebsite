import { describe, expect, it } from "vitest"

import {
  LABS_TRACKS,
  labsNavIsActive,
  visibleLabsTracks,
  type LabsTrackId,
} from "@/components/labs/labs-tracks"
import { palantir911Dispatch } from "@/lib/labs/case-labs/palantir-911-dispatch"

describe("labs-tracks registry", () => {
  it("has unique ids and non-empty content per track", () => {
    const ids = LABS_TRACKS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const track of LABS_TRACKS) {
      expect(track.label.length).toBeGreaterThan(0)
      expect(track.blurb.length).toBeGreaterThan(0)
      expect(track.commitment.length).toBeGreaterThan(0)
      expect(track.actionLabel.length).toBeGreaterThan(0)
      expect(track.accessNote.length).toBeGreaterThan(0)
      expect(track.href.startsWith("/")).toBe(true)
    }
  })

  it("marks both Labs tracks as coming soon", () => {
    expect(LABS_TRACKS.map(({ id, statusLabel }) => [id, statusLabel])).toEqual([
      ["decomposition", "Coming soon"],
      ["sprint", "Coming soon"],
    ])
  })

  it("routes Decomposition directly to the authored decomposition case, ungated", () => {
    const decomposition = LABS_TRACKS.find((t) => t.id === "decomposition")
    expect(decomposition?.href).toBe(`/labs/${palantir911Dispatch.id}`)
    expect(decomposition?.requiresSprintLabs).toBeUndefined()
  })

  it("routes Sprint into the Meridian workbook, gated on the flag", () => {
    const sprint = LABS_TRACKS.find((t) => t.id === "sprint")
    expect(sprint?.href).toBe("/sprint-labs/meridian")
    expect(sprint?.requiresSprintLabs).toBe(true)
  })

  it("gates exactly one track behind Sprint Labs", () => {
    expect(LABS_TRACKS.filter((t) => t.requiresSprintLabs)).toHaveLength(1)
  })

  it("hides the flagged track until the flag is confirmed on (fails closed)", () => {
    const idsFor = (v: boolean | null): LabsTrackId[] => visibleLabsTracks(v).map((t) => t.id)
    expect(idsFor(null)).toEqual(["decomposition"])
    expect(idsFor(false)).toEqual(["decomposition"])
    expect(idsFor(true)).toEqual(["decomposition", "sprint"])
  })

  it("marks the Labs nav active across both catalogs and their children", () => {
    for (const path of ["/labs", "/labs/palantir-fdse", "/sprint-labs", "/sprint-labs/meridian"]) {
      expect(labsNavIsActive(path)).toBe(true)
    }
    for (const path of ["/dashboard", "/interview", "/learn", "/"]) {
      expect(labsNavIsActive(path)).toBe(false)
    }
  })
})
