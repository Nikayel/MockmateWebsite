import { describe, expect, it } from "vitest"

import { arraysHashingScenarios } from "../dsa/arrays-hashing"
import { binarySearchScenarios } from "../dsa/binary-search"
import { binarySearchTreeScenarios } from "../dsa/binary-search-tree"
import { dpScenarios } from "../dsa/dynamic-programming"
import { graphsScenarios } from "../dsa/graphs"
import { linkedListScenarios } from "../dsa/linked-list"
import { stackScenarios } from "../dsa/stack"
import { treesScenarios } from "../dsa/trees"
import { twoPointersScenarios } from "../dsa/two-pointers"

const scenarioGroups = {
  arraysHashingScenarios,
  twoPointersScenarios,
  stackScenarios,
  binarySearchScenarios,
  binarySearchTreeScenarios,
  treesScenarios,
  graphsScenarios,
  linkedListScenarios,
  dpScenarios,
}

const expectedScenarioIds = {
  arraysHashingScenarios: [
    "dsa-two-sum",
    "dsa-contains-duplicate",
    "dsa-product-array-except-self",
    "dsa-group-anagrams",
    "dsa-longest-consecutive-sequence",
    "dsa-first-missing-positive",
    "dsa-valid-anagram",
    "dsa-top-k-frequent-elements",
    "dsa-encode-decode-strings",
    "dsa-subarray-sum-equals-k",
    "dsa-find-all-duplicates",
    "dsa-next-permutation",
    "dsa-majority-element",
    "dsa-rotate-array",
  ],
  twoPointersScenarios: [
    "dsa-3sum",
    "dsa-trapping-rain-water-two-pointers",
    "dsa-container-with-most-water",
    "dsa-longest-palindromic-substring",
    "dsa-remove-duplicates-sorted-array",
    "dsa-move-zeroes",
    "dsa-valid-palindrome",
    "dsa-sort-colors",
    "dsa-reverse-string",
    "dsa-partition-labels",
    "dsa-two-sum-ii-sorted",
    "dsa-4sum",
    "dsa-squares-sorted-array",
    "dsa-boats-save-people",
    "dsa-merge-sorted-array",
    "dsa-even-odd-index-sum-difference",
    "dsa-student-highest-average",
  ],
  stackScenarios: [
    "dsa-valid-parentheses",
    "dsa-min-stack",
    "dsa-daily-temperatures",
    "dsa-largest-rectangle-histogram",
    "dsa-evaluate-reverse-polish",
    "dsa-decode-string",
    "dsa-asteroid-collision",
    "dsa-simplify-path",
    "dsa-basic-calculator",
    "dsa-remove-duplicates-string",
    "dsa-longest-valid-parentheses",
    "dsa-car-fleet",
    "dsa-trapping-rain-water",
    "dsa-next-greater-element-i",
    "dsa-next-greater-element-ii",
    "dsa-online-stock-span",
    "dsa-132-pattern",
    "dsa-max-frequency-stack",
  ],
  binarySearchScenarios: [
    "dsa-binary-search",
    "dsa-search-rotated-sorted-array",
    "dsa-find-first-last-position",
    "dsa-find-minimum-rotated-sorted-array",
    "dsa-search-2d-matrix",
    "dsa-koko-eating-bananas",
    "dsa-median-two-sorted-arrays",
    "dsa-first-bad-version",
    "dsa-search-insert-position",
    "dsa-time-based-key-value-store",
    "dsa-capacity-ship-packages",
  ],
  binarySearchTreeScenarios: [
    "dsa-valid-binary-search-tree",
    "dsa-lowest-common-ancestor-bst",
    "dsa-kth-smallest-bst",
    "dsa-delete-node-bst",
    "dsa-convert-sorted-array-bst",
    "dsa-two-sum-bst",
    "dsa-bst-iterator",
    "dsa-range-sum-bst",
    "dsa-serialize-deserialize-bst",
    "dsa-closest-bst-value",
    "dsa-inorder-successor-bst",
  ],
  treesScenarios: [
    "dsa-invert-binary-tree",
    "dsa-same-tree",
    "dsa-maximum-depth-binary-tree",
    "dsa-symmetric-tree",
    "dsa-subtree-of-another-tree",
    "dsa-balanced-binary-tree",
    "dsa-binary-tree-right-side-view",
    "dsa-count-good-nodes",
    "dsa-construct-binary-tree-preorder-inorder",
    "dsa-binary-tree-inorder",
    "dsa-serialize-deserialize-tree",
    "dsa-binary-tree-max-path-sum",
    "dsa-lowest-common-ancestor-binary-tree",
    "dsa-binary-tree-level-order",
    "dsa-diameter-of-binary-tree",
    "dsa-path-sum",
    "dsa-path-sum-ii",
    "dsa-flatten-binary-tree",
    "dsa-sum-root-to-leaf",
    "dsa-populating-next-right",
    "dsa-validate-bst",
    "dsa-binary-tree-zigzag",
    "dsa-all-nodes-distance-k",
    "dsa-vertical-order-traversal",
    "dsa-recover-bst",
  ],
  graphsScenarios: [
    "dsa-number-of-islands",
    "dsa-course-schedule",
    "dsa-clone-graph",
    "dsa-word-ladder",
    "dsa-pacific-atlantic-water-flow",
    "dsa-rotting-oranges",
    "dsa-graph-valid-tree",
    "dsa-course-schedule-ii",
    "dsa-alien-dictionary",
    "dsa-all-paths-source-target",
    "dsa-surrounded-regions",
    "dsa-number-connected-components",
    "dsa-redundant-connection",
    "dsa-network-delay-time",
    "dsa-cheapest-flights-k-stops",
    "dsa-min-cost-connect-points",
    "dsa-accounts-merge",
    "dsa-swim-in-rising-water",
    "dsa-walls-and-gates",
    "dsa-shortest-path-binary-matrix",
    "dsa-open-the-lock",
    "dsa-evaluate-division",
    "dsa-is-graph-bipartite",
    "dsa-find-path-exists",
    "dsa-keys-and-rooms",
    "dsa-snakes-and-ladders",
    "dsa-find-town-judge",
  ],
  linkedListScenarios: [
    "dsa-reverse-linked-list",
    "dsa-linked-list-cycle",
    "dsa-lru-cache",
    "dsa-merge-two-sorted-lists",
    "dsa-copy-list-random-pointer",
    "dsa-reorder-list",
    "dsa-remove-nth-from-end",
    "dsa-add-two-numbers",
    "dsa-linked-list-cycle-ii",
    "dsa-intersection-two-linked-lists",
    "dsa-remove-duplicates-sorted-list",
    "dsa-palindrome-linked-list",
    "dsa-middle-linked-list",
    "dsa-reverse-nodes-k-group",
    "dsa-sort-list",
    "dsa-swap-nodes-pairs",
  ],
  dpScenarios: [
    "dsa-maximum-subarray",
    "dsa-climbing-stairs",
    "dsa-longest-increasing-subsequence",
    "dsa-word-break",
    "dsa-house-robber",
    "dsa-unique-paths",
    "dsa-edit-distance",
    "dsa-coin-change",
    "dsa-longest-common-subsequence",
    "dsa-01-knapsack",
    "dsa-partition-equal-subset-sum",
    "dsa-regular-expression-matching",
    "dsa-house-robber-ii",
    "dsa-decode-ways",
    "dsa-maximum-product-subarray",
    "dsa-target-sum",
    "dsa-minimum-path-sum",
    "dsa-palindromic-substrings",
    "dsa-longest-palindromic-subsequence",
    "dsa-best-time-buy-sell-stock-ii",
    "dsa-best-time-buy-sell-stock-cooldown",
    "dsa-triangle",
    "dsa-maximal-square",
    "dsa-min-cost-climbing-stairs",
  ],
}

describe("large DSA scenario modules", () => {
  it("keeps expected scenario order and IDs", () => {
    for (const [groupName, scenarios] of Object.entries(scenarioGroups)) {
      expect(scenarios.map((scenario) => scenario.id)).toEqual(
        expectedScenarioIds[groupName as keyof typeof expectedScenarioIds]
      )
    }
  })

  it("exports complete DSA scenario records for consumers", () => {
    for (const scenarios of Object.values(scenarioGroups)) {
      for (const scenario of scenarios) {
        expect(scenario.type).toBe("dsa")
        expect(scenario.title).toBeTruthy()
        expect(scenario.pattern).toBeTruthy()
        expect(scenario.difficulty).toBeTruthy()
        expect(scenario.problemStatement).toBeTruthy()
        expect(scenario.examples.length).toBeGreaterThan(0)
        expect(scenario.constraints.length).toBeGreaterThan(0)
        expect(scenario.testCases.length).toBeGreaterThan(0)
      }
    }
  })
})
