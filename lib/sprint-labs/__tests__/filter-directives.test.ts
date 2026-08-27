/**
 * Tests for `filterDirectives` (docs/sprint-labs/PLAN.md Task 8,
 * AGENT-CONTEXT.md §3 Layer C).
 *
 * Signature note: AGENT-CONTEXT.md and PLAN.md both write the shorthand
 * `filterDirectives(entries, currentHiddenTopicTags)`, but the same section
 * also requires sprint-based decay ("entries decay after N sprints"), which
 * is undecidable without knowing the CURRENT sprint number. This
 * implementation therefore takes a third `currentSprint` parameter. The
 * "two clean passes" half of that same sentence describes a STATEFUL
 * decision about when to stop authoring/keep a directive in the stored list
 * in the first place (the in-workspace partner's concern, PLAN.md Task 14) —
 * out of scope for this pure filter, which only ever removes entries it is
 * handed, never tracks history across calls.
 */

import { describe, expect, it } from "vitest"
import { filterDirectives } from "../grading/filterDirectives"
import type { DirectiveEntry } from "../types"

function entry(overrides: Partial<DirectiveEntry> = {}): DirectiveEntry {
  return {
    id: "d1",
    instruction: "narrate the invariant before editing and leave the assertion for the learner",
    tags: ["tenant-scoping"],
    createdSprint: 3,
    expiresAfterSprint: 2,
    ...overrides,
  }
}

describe("filterDirectives", () => {
  it("returns entries unchanged when nothing collides and nothing has expired", () => {
    const entries = [entry({ id: "d1", tags: ["idempotency"] })]
    expect(filterDirectives(entries, ["tenant-scoping"], 3)).toEqual(entries)
  })

  it("returns an empty array for an empty entry list", () => {
    expect(filterDirectives([], ["anything"], 5)).toEqual([])
  })

  describe("tag collision — drops, never paraphrases", () => {
    it("drops an entry whose single tag intersects a current hidden-test tag", () => {
      const entries = [entry({ id: "d1", tags: ["tenant-scoping"] })]
      expect(filterDirectives(entries, ["tenant-scoping"], 3)).toEqual([])
    })

    it("drops an entry when ANY of its multiple tags intersects (not requiring all to match)", () => {
      const entries = [entry({ id: "d1", tags: ["idempotency", "tenant-scoping", "webhooks"] })]
      expect(filterDirectives(entries, ["tenant-scoping"], 3)).toEqual([])
    })

    it("keeps an entry whose tags share no member with the current hidden-test tags", () => {
      const entries = [entry({ id: "d1", tags: ["idempotency"] })]
      expect(filterDirectives(entries, ["tenant-scoping", "webhooks"], 3)).toHaveLength(1)
    })

    it("keeps an entry with no tags at all (nothing to collide on)", () => {
      const entries = [entry({ id: "d1", tags: [] })]
      expect(filterDirectives(entries, ["tenant-scoping"], 3)).toHaveLength(1)
    })

    it("matches collision by exact tag string, never by substring or paraphrase", () => {
      const entries = [entry({ id: "d1", tags: ["tenant-scoping-v2"] })]
      expect(filterDirectives(entries, ["tenant-scoping"], 3)).toHaveLength(1)
    })

    it("treats currentHiddenTopicTags as a set: duplicate tags collide only once, no crash", () => {
      const entries = [entry({ id: "d1", tags: ["tenant-scoping"] })]
      expect(filterDirectives(entries, ["tenant-scoping", "tenant-scoping"], 3)).toEqual([])
    })

    it("filters independently per entry across a mixed list", () => {
      const colliding = entry({ id: "colliding", tags: ["tenant-scoping"] })
      const clean = entry({ id: "clean", tags: ["idempotency"] })
      const result = filterDirectives([colliding, clean], ["tenant-scoping"], 3)
      expect(result.map((e) => e.id)).toEqual(["clean"])
    })
  })

  describe("sprint-based decay (expiresAfterSprint)", () => {
    // createdSprint=3, expiresAfterSprint=2 -> valid through sprint 5, gone at sprint 6.
    it("keeps an entry exactly at its createdSprint", () => {
      const entries = [entry({ createdSprint: 3, expiresAfterSprint: 2 })]
      expect(filterDirectives(entries, [], 3)).toHaveLength(1)
    })

    it("keeps an entry mid-window", () => {
      const entries = [entry({ createdSprint: 3, expiresAfterSprint: 2 })]
      expect(filterDirectives(entries, [], 4)).toHaveLength(1)
    })

    it("keeps an entry exactly at the boundary sprint (createdSprint + expiresAfterSprint)", () => {
      const entries = [entry({ createdSprint: 3, expiresAfterSprint: 2 })]
      expect(filterDirectives(entries, [], 5)).toHaveLength(1)
    })

    it("drops an entry the sprint immediately after the boundary", () => {
      const entries = [entry({ createdSprint: 3, expiresAfterSprint: 2 })]
      expect(filterDirectives(entries, [], 6)).toEqual([])
    })

    it("drops an entry many sprints past its boundary", () => {
      const entries = [entry({ createdSprint: 1, expiresAfterSprint: 1 })]
      expect(filterDirectives(entries, [], 10)).toEqual([])
    })

    it("expiry and tag-collision are independent: an expired entry is dropped even with no tag collision", () => {
      const entries = [entry({ createdSprint: 1, expiresAfterSprint: 1, tags: ["idempotency"] })]
      expect(filterDirectives(entries, ["tenant-scoping"], 10)).toEqual([])
    })

    it("a non-expired, non-colliding entry survives alongside an expired one", () => {
      const fresh = entry({ id: "fresh", createdSprint: 9, expiresAfterSprint: 2, tags: [] })
      const stale = entry({ id: "stale", createdSprint: 1, expiresAfterSprint: 1, tags: [] })
      expect(filterDirectives([fresh, stale], [], 9).map((e) => e.id)).toEqual(["fresh"])
    })
  })

  it("never mutates the input array or its entries", () => {
    const entries = [entry({ id: "d1", tags: ["tenant-scoping"] }), entry({ id: "d2", tags: [] })]
    const snapshot = JSON.parse(JSON.stringify(entries))
    filterDirectives(entries, ["tenant-scoping"], 3)
    expect(entries).toEqual(snapshot)
  })

  it("never paraphrases: every entry it returns is referentially the same object it was given", () => {
    const kept = entry({ id: "kept", tags: [] })
    const result = filterDirectives([kept], ["something-else"], 3)
    expect(result[0]).toBe(kept)
  })
})
