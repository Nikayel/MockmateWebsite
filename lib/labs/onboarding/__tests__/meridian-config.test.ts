import { existsSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { findSystemMapBeat } from "@/lib/labs/onboarding/config"
import { MERIDIAN_ONBOARDING } from "@/lib/labs/onboarding/meridian-config"

const REPO_ROOT = resolve(process.cwd(), "workbooks/meridian/repo")

describe("Meridian onboarding config", () => {
  it("is the Meridian arc, five beats in cinematic order", () => {
    expect(MERIDIAN_ONBOARDING.id).toBe("meridian")
    expect(MERIDIAN_ONBOARDING.company).toBe("Meridian")
    expect(MERIDIAN_ONBOARDING.beats.map((b) => b.kind)).toEqual([
      "offer",
      "company",
      "system-map",
      "pair",
      "handoff",
    ])
  })

  it("has a unique chapter label per beat", () => {
    const chapters = MERIDIAN_ONBOARDING.beats.map((b) => b.chapter)
    expect(new Set(chapters).size).toBe(chapters.length)
  })

  it("opens with the offer and closes with a handoff that has a CTA", () => {
    const offer = MERIDIAN_ONBOARDING.beats[0]
    expect(offer.kind === "offer" && offer.lines.length).toBeGreaterThan(0)
    const handoff = MERIDIAN_ONBOARDING.beats.at(-1)
    expect(handoff?.kind).toBe("handoff")
    if (handoff?.kind === "handoff") expect(handoff.ctaLabel.length).toBeGreaterThan(0)
  })

  it("maps every module to a real top-level directory in the Meridian repo", () => {
    // The "this is this" must be true: a map that names a path the repo doesn't have is a lie the
    // learner inherits. This is the same discipline /labs applies to its own explainer copy.
    const map = findSystemMapBeat(MERIDIAN_ONBOARDING)
    expect(map).not.toBeNull()
    expect(map!.modules.length).toBeGreaterThanOrEqual(5)
    for (const mod of map!.modules) {
      expect(mod.path.length).toBeGreaterThan(0)
      expect(
        existsSync(resolve(REPO_ROOT, mod.path)),
        `module "${mod.label}" points at ${mod.path}, which does not exist in the Meridian repo`
      ).toBe(true)
    }
  })

  it("gives each module a distinct id and a non-empty role", () => {
    const map = findSystemMapBeat(MERIDIAN_ONBOARDING)!
    const ids = map.modules.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const mod of map.modules) expect(mod.role.length).toBeGreaterThan(0)
  })
})
