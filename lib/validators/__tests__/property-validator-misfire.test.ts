import { describe, expect, it } from "vitest"

import { scenarios } from "@/lib/scenarios"
import { validateResultEnhanced } from "@/lib/validators/runner"

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
