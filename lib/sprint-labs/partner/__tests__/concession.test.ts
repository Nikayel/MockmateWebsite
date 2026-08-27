/**
 * Concession-trigger matching (docs/sprint-labs/AGENT-CONTEXT.md §6): "a
 * machine-checkable event with an authored trigger", so the author-agent
 * persona neither folds at the first sign of pushback nor holds out forever.
 * Substring/normalized per PLAN.md Task 14 — case- and whitespace-insensitive,
 * nothing fuzzier.
 */
import { describe, expect, it } from "vitest"
import { findMatchedConcessionTrigger, matchesConcessionTrigger } from "../concession"

describe("matchesConcessionTrigger", () => {
  it("matches an exact substring", () => {
    expect(
      matchesConcessionTrigger("what about the missing sunset date", "missing sunset date")
    ).toBe(true)
  })

  it("is case-insensitive", () => {
    expect(matchesConcessionTrigger("MISSING SUNSET DATE, right?", "missing sunset date")).toBe(
      true
    )
  })

  it("normalizes whitespace on both sides", () => {
    expect(
      matchesConcessionTrigger("there's a   missing\nsunset   date here", "missing sunset date")
    ).toBe(true)
  })

  it("does not match unrelated text", () => {
    expect(matchesConcessionTrigger("what does this endpoint return", "missing sunset date")).toBe(
      false
    )
  })

  it("does not match a blank trigger", () => {
    expect(matchesConcessionTrigger("anything at all", "   ")).toBe(false)
  })
})

describe("findMatchedConcessionTrigger", () => {
  const triggers = ["missing sunset date", "two concurrent requests, same key, different workers"]

  it("returns the first trigger that matches", () => {
    expect(findMatchedConcessionTrigger("isn't there a missing sunset date here?", triggers)).toBe(
      "missing sunset date"
    )
  })

  it("returns null when nothing matches", () => {
    expect(findMatchedConcessionTrigger("looks fine to me", triggers)).toBeNull()
  })

  it("returns null for an empty trigger list", () => {
    expect(findMatchedConcessionTrigger("anything", [])).toBeNull()
  })
})
