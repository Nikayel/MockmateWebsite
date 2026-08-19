/**
 * House-voice guard for DSA problem statements (2026-08-18 originality sweep).
 *
 * The sweep rewrote all 221 DSA scenarios from near-verbatim LeetCode text into
 * original expression. This test is the rule-as-a-test that keeps it that way:
 * a NEW scenario pasted in from LeetCode fails the build instead of quietly
 * re-introducing copied text.
 *
 * What it enforces (learner-facing fields only):
 *  - statements never open the way LeetCode's do ("Given ...", "You are given")
 *  - no LeetCode-distinctive boilerplate phrases anywhere learner-facing
 *  - no em dashes in learner-facing prose (house content rule)
 *
 * The full one-time sweep verifier (baseline diff, similarity ceiling, frozen
 * field hashes) lives in scripts/dsa-originality/verify.ts.
 */

import { describe, expect, it } from "vitest"
import { scenarios } from "@/lib/scenarios"
import type { DSAScenario } from "@/lib/scenarios/types"

const LC_FINGERPRINTS = [
  "you may assume that each input would have exactly one solution",
  "you may not use the same element twice",
  "you can return the answer in any order",
  "return the answer in any order",
  "it is guaranteed that",
  "such that they add up to",
  "given an array of integers nums",
  "you must write an algorithm",
  "determine if the linked list has a cycle in it",
  "without changing the order of the other elements",
  "you may assume that the input",
  "you may assume all",
]

const BANNED_OPENERS = [/^given /i, /^you are given/i]

const dsaScenarios = (scenarios as Array<{ type: string }>).filter(
  (s): s is DSAScenario => s.type === "dsa"
)

function learnerFacingText(s: DSAScenario): string {
  return [
    s.problemStatement,
    s.description,
    ...s.constraints,
    ...s.examples.flatMap((e) => [e.input, e.output, e.explanation ?? ""]),
  ].join("\n")
}

describe("DSA statements stay in the house voice", () => {
  it("covers the whole corpus", () => {
    expect(dsaScenarios.length).toBeGreaterThanOrEqual(221)
  })

  it.each(dsaScenarios.map((s) => [s.id, s] as const))(
    "%s carries no LeetCode fingerprints or banned openers",
    (_id, s) => {
      const stmt = s.problemStatement.trim()
      expect(stmt.length).toBeGreaterThan(0)

      for (const opener of BANNED_OPENERS) {
        expect(stmt, `statement opens like LeetCode (${opener})`).not.toMatch(opener)
      }

      const text = learnerFacingText(s).toLowerCase()
      for (const phrase of LC_FINGERPRINTS) {
        expect(text, `LeetCode fingerprint: "${phrase}"`).not.toContain(phrase)
      }

      expect(learnerFacingText(s), "em dash in learner-facing text").not.toContain("—")
    }
  )
})
