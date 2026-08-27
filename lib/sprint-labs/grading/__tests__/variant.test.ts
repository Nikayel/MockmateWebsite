/**
 * Tests for deterministic hidden-suite variant selection
 * (docs/sprint-labs/AGENT-CONTEXT.md §5.3, WORKBOOK-SPEC.md §5 rule 3:
 * "re-attempts draw a different hidden-suite variant with a rotating,
 * never-named held-back subset"). See variant.ts's file header for the full
 * scheme this exercises.
 */

import { describe, expect, it } from "vitest"
import { SPRINT_LAB_SUBMISSION_BUDGET } from "../budget"
import { selectHiddenVariant } from "../variant"

const TICKET = "MER-201"

describe("selectHiddenVariant", () => {
  it("is deterministic: identical inputs always produce identical output", () => {
    const ids = ["a", "b", "c", "d", "e", "f"]
    const first = selectHiddenVariant(ids, "user-1", TICKET, 0)
    const second = selectHiddenVariant(ids, "user-1", TICKET, 0)
    expect(second).toEqual(first)
  })

  it("returns an empty selection for an empty case-id list", () => {
    const result = selectHiddenVariant([], "user-1", TICKET, 0)
    expect(result.issuedCaseIds).toEqual([])
    expect(result.heldBackCaseIds).toEqual([])
    expect(result.variantId).toEqual(expect.any(String))
  })

  it("issues every case when there are too few to meaningfully hold any back (pool of 1)", () => {
    const result = selectHiddenVariant(["only-one"], "user-1", TICKET, 0)
    expect(result.issuedCaseIds).toEqual(["only-one"])
    expect(result.heldBackCaseIds).toEqual([])
  })

  it("issues every case when there are too few to meaningfully hold any back (pool of 2)", () => {
    const result = selectHiddenVariant(["a", "b"], "user-1", TICKET, 0)
    expect([...result.issuedCaseIds, ...result.heldBackCaseIds].sort()).toEqual(["a", "b"])
    expect(result.heldBackCaseIds).toEqual([])
  })

  it("never issues a case that is on its own held-back list", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `case-${i}`)
    const result = selectHiddenVariant(ids, "user-1", TICKET, 0)
    const heldBack = new Set(result.heldBackCaseIds)
    for (const issued of result.issuedCaseIds) {
      expect(heldBack.has(issued)).toBe(false)
    }
  })

  it("holds back roughly a third of a large pool, and never the whole pool", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `case-${i}`)
    const result = selectHiddenVariant(ids, "user-1", TICKET, 0)
    expect(result.heldBackCaseIds.length).toBeGreaterThan(0)
    expect(result.heldBackCaseIds.length).toBeLessThan(ids.length)
  })

  it("the held-back set is identical across every attemptIndex for the same (ticket, pool) — a permanent reserve", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `case-${i}`)
    const heldBackAcrossAttempts = new Set<string>()
    for (let attemptIndex = 0; attemptIndex < SPRINT_LAB_SUBMISSION_BUDGET; attemptIndex++) {
      const result = selectHiddenVariant(ids, "user-1", TICKET, attemptIndex)
      heldBackAcrossAttempts.add(JSON.stringify(result.heldBackCaseIds))
    }
    expect(heldBackAcrossAttempts.size).toBe(1)
  })

  it("the held-back set never appears in ANY issued set across the entire submission budget", () => {
    const ids = Array.from({ length: 15 }, (_, i) => `case-${i}`)
    const { heldBackCaseIds } = selectHiddenVariant(ids, "user-1", TICKET, 0)
    const heldBack = new Set(heldBackCaseIds)
    for (let attemptIndex = 0; attemptIndex < SPRINT_LAB_SUBMISSION_BUDGET; attemptIndex++) {
      const result = selectHiddenVariant(ids, "user-1", TICKET, attemptIndex)
      for (const issued of result.issuedCaseIds) {
        expect(heldBack.has(issued)).toBe(false)
      }
    }
  })

  it("the held-back set is the same across different users (content-level, not per-learner)", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `case-${i}`)
    const a = selectHiddenVariant(ids, "user-a", TICKET, 0)
    const b = selectHiddenVariant(ids, "user-b", TICKET, 0)
    expect(a.heldBackCaseIds).toEqual(b.heldBackCaseIds)
  })

  it("rotates: at least one later attemptIndex issues a different subset than attemptIndex 0", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `case-${i}`)
    const first = selectHiddenVariant(ids, "user-1", TICKET, 0)
    const differsSomewhere = Array.from(
      { length: SPRINT_LAB_SUBMISSION_BUDGET - 1 },
      (_, i) => i + 1
    ).some((attemptIndex) => {
      const later = selectHiddenVariant(ids, "user-1", TICKET, attemptIndex)
      return JSON.stringify(later.issuedCaseIds) !== JSON.stringify(first.issuedCaseIds)
    })
    expect(differsSomewhere).toBe(true)
  })

  it("different users draw different variantIds for the same attemptIndex (large enough pool to distinguish)", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `case-${i}`)
    const a = selectHiddenVariant(ids, "user-a", TICKET, 0)
    const b = selectHiddenVariant(ids, "user-b", TICKET, 0)
    expect(a.variantId).not.toEqual(b.variantId)
  })

  it("different attemptIndex values for the same user draw different variantIds", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `case-${i}`)
    const first = selectHiddenVariant(ids, "user-1", TICKET, 0)
    const second = selectHiddenVariant(ids, "user-1", TICKET, 1)
    expect(first.variantId).not.toEqual(second.variantId)
  })

  it("different ticket keys draw different variantIds for the same user/attemptIndex", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `case-${i}`)
    const a = selectHiddenVariant(ids, "user-1", "MER-201", 0)
    const b = selectHiddenVariant(ids, "user-1", "MER-202", 0)
    expect(a.variantId).not.toEqual(b.variantId)
  })

  it("issued ids are always a subset of the input ids", () => {
    const ids = ["x", "y", "z", "w", "q"]
    const result = selectHiddenVariant(ids, "user-1", TICKET, 2)
    for (const id of result.issuedCaseIds) {
      expect(ids).toContain(id)
    }
  })

  it("issued ids contain no duplicates", () => {
    const ids = Array.from({ length: 7 }, (_, i) => `case-${i}`)
    const result = selectHiddenVariant(ids, "user-1", TICKET, 3)
    expect(new Set(result.issuedCaseIds).size).toBe(result.issuedCaseIds.length)
  })

  it("is insensitive to the input array's order (sorts internally)", () => {
    const ids = ["c", "a", "b"]
    const shuffled = ["b", "c", "a"]
    expect(selectHiddenVariant(ids, "user-1", TICKET, 0)).toEqual(
      selectHiddenVariant(shuffled, "user-1", TICKET, 0)
    )
  })

  it("fix round 1, M11: variantId is an opaque hash, never the old leaky `v<attemptIndex>-<hash>` shape", () => {
    const ids = Array.from({ length: 8 }, (_, i) => `case-${i}`)
    for (let attemptIndex = 0; attemptIndex < SPRINT_LAB_SUBMISSION_BUDGET; attemptIndex++) {
      const { variantId } = selectHiddenVariant(ids, "user-1", TICKET, attemptIndex)
      // The retired format was literally `v${attemptIndex}-${hash}` (e.g. "v2-abc123"),
      // handing "this is my 3rd attempt" to the client in plaintext. Guard against that
      // exact shape (digits then a hyphen right after the leading "v") reappearing.
      expect(variantId).not.toMatch(/^v\d+-/)
    }
  })
})
