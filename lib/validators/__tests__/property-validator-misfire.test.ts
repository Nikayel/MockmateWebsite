import { describe, expect, it } from "vitest"

import { scenarios } from "@/lib/scenarios"
import { validateResultEnhanced } from "@/lib/validators/runner"
import { PropertyBuilders } from "@/lib/validators/types"

/**
 * A property validator must never reject a scenario's own documented answer key.
 *
 * These validators were auto-attached by substring matches on the scenario id, or by loose
 * input-shape guesses, and several fired on problems whose correct answers do not satisfy the
 * property at all:
 *
 *   dsa-two-sum-bst              id contains "two-sum", but it is a BST search       0/2
 *   dsa-two-sum-ii-sorted        id contains "two-sum", keys `numbers`, 1-indexed    0/3
 *   dsa-find-first-last-position nums + target + 2 values, but they are index BOUNDS 0/2
 *                                so the check asserted 8 + 8 === 8
 *   dsa-palindrome-linked-list   validator reads input.s, gets "", calls it a        3/4
 *                                palindrome, and rejects the correct false
 *
 * In every case the platform marked a correct solution wrong, with nothing broken. This runs
 * each scenario's own expected values back through its auto-detected validators and fails if
 * any of them are refused.
 */

const dsaScenarios = scenarios.filter(
  (scenario) => scenario.type === "dsa" && Array.isArray(scenario.testCases)
)

describe("property validators accept the answer keys they guard", () => {
  it("found DSA scenarios to check", () => {
    expect(dsaScenarios.length).toBeGreaterThan(0)
  })

  it("never rejects a scenario's own documented expected value", () => {
    const rejected: string[] = []

    for (const scenario of dsaScenarios) {
      for (const testCase of scenario.testCases ?? []) {
        if (testCase.expected === undefined) continue

        let result
        try {
          // The scenario's own answer key IS the actual output, so this simulates a candidate
          // who produced exactly the documented correct answer.
          result = validateResultEnhanced(
            testCase.expected,
            {
              input: testCase.input,
              expected: testCase.expected,
              description: testCase.description ?? "",
            },
            scenario.id,
            "javascript"
          )
        } catch (error) {
          rejected.push(
            `${scenario.id} "${testCase.description}": validator threw - ${(error as Error).message}`
          )
          continue
        }

        if (!result.passed) {
          rejected.push(`${scenario.id} "${testCase.description}": ${result.reason ?? "rejected"}`)
        }
      }
    }

    expect(
      rejected,
      `A property validator refused the scenario's OWN expected value, so a candidate who ` +
        `produces the documented correct answer is marked wrong:\n  ` +
        rejected.join("\n  ")
    ).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// dsa-delete-node-bst: several correct answers, previously graded by exact match
// against the successor-shaped one (2026-08-19 adversarial audit).
// ---------------------------------------------------------------------------
describe("bstAfterDeletion (dsa-delete-node-bst)", () => {
  const check = (root: Array<number | null>, key: number, output: Array<number | null>) =>
    PropertyBuilders.bstAfterDeletion("root", "key").check({
      input: { root, key },
      output,
    } as never)

  const TREE: Array<number | null> = [5, 3, 6, 2, 4, null, 7]

  it("accepts the successor-shaped answer the frozen key used", () => {
    expect(check(TREE, 3, [5, 4, 6, 2, null, null, 7])).toBe(true)
  })

  it("accepts the predecessor-shaped answer, which exact match rejected", () => {
    expect(check(TREE, 3, [5, 2, 6, null, 4, null, 7])).toBe(true)
  })

  it("treats deleting an absent key as a no-op", () => {
    expect(check(TREE, 0, TREE)).toBe(true)
  })

  it("rejects a tree that dropped the wrong value", () => {
    expect(check(TREE, 3, [5, 4, 6, 3, null, null, 7])).toBe(false)
  })

  it("rejects a result that is not a BST", () => {
    expect(check(TREE, 3, [5, 7, 6, 2, 4])).toBe(false)
  })

  it("rejects a result that deleted nothing when the key was present", () => {
    expect(check(TREE, 3, TREE)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Multi-valid string rearrangements, previously graded by exact string match
// (2026-08-19 adversarial audit).
// ---------------------------------------------------------------------------
describe("spacedRearrangement (reorganize / rearrange-k-distance)", () => {
  const adjacency = (s: string, output: string) =>
    PropertyBuilders.spacedRearrangement("s").check({ input: { s }, output } as never)
  const kDistance = (s: string, k: number, output: string) =>
    PropertyBuilders.spacedRearrangement("s", "k").check({ input: { s, k }, output } as never)

  it("accepts both valid answers for aabb, not just the frozen one", () => {
    expect(adjacency("aabb", "abab")).toBe(true)
    expect(adjacency("aabb", "baba")).toBe(true)
  })

  it("rejects an arrangement that leaves equal letters adjacent", () => {
    expect(adjacency("aabb", "aabb")).toBe(false)
  })

  it("rejects an arrangement that is not a permutation of the input", () => {
    expect(adjacency("aabb", "abac")).toBe(false)
  })

  it("accepts an empty answer only when no arrangement exists", () => {
    expect(adjacency("aaab", "")).toBe(true)
    expect(adjacency("aabb", "")).toBe(false)
  })

  it("honours the k gap and accepts answers the frozen key excluded", () => {
    // The frozen key pinned "abacabcd"; this is another correct arrangement.
    expect(kDistance("aaadbbcc", 2, "abacabcd")).toBe(true)
    expect(kDistance("aaadbbcc", 2, "ababacdc")).toBe(true)
    expect(kDistance("aabbcc", 3, "abcabc")).toBe(true)
  })

  it("rejects a k-gap violation and confirms genuine impossibility", () => {
    expect(kDistance("aabb", 2, "aabb")).toBe(false)
    expect(kDistance("aaabc", 3, "")).toBe(true)
  })

  it("treats k of 0 or 1 as no restriction", () => {
    expect(kDistance("aa", 0, "aa")).toBe(true)
  })
})
