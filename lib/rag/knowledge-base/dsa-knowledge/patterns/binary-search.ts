import type { DSAPatternKnowledge } from "../../types"

export const binarySearchKnowledge: DSAPatternKnowledge = {
  pattern: "binary-search",
  displayName: "Binary Search",
  description:
    "Divide and conquer on sorted arrays. Eliminates half the search space each iteration, achieving O(log n) time. Applicable to any monotonic search space.",
  whenToUse: [
    "Searching in sorted array",
    "Finding first/last occurrence",
    "Search space has monotonic property",
    "Minimizing/maximizing with a check function",
    "Finding boundary in rotated sorted array",
  ],
  keyInsights: [
    "Search space must have monotonic property",
    "Choose mid calculation to avoid overflow: left + (right - left) // 2",
    "Boundary conditions: left <= right vs left < right",
    "Can search on answer space, not just array indices",
  ],
  commonMistakes: [
    "Integer overflow when calculating mid",
    "Infinite loop from incorrect boundary updates",
    "Off-by-one in left/right pointer updates",
    "Not handling duplicates correctly",
  ],
  timeComplexity: {
    typical: "O(log n)",
    best: "O(1) if target is at mid",
    worst: "O(log n)",
  },
  spaceComplexity: {
    typical: "O(1) iterative, O(log n) recursive",
    notes: "Iterative version is preferred for space efficiency",
  },
  relatedPatterns: ["two-pointers", "arrays-hashing"],
  prerequisites: ["arrays-hashing"],
  codeTemplate: `def binary_search(nums, target):
  left, right = 0, len(nums) - 1

  while left <= right:
      mid = left + (right - left) // 2
      if nums[mid] == target:
          return mid
      elif nums[mid] < target:
          left = mid + 1
      else:
          right = mid - 1

  return -1  # or left for insertion point`,
  examples: [
    "Binary Search: Find target in sorted array",
    "Search in Rotated Sorted Array",
    "Find Minimum in Rotated Sorted Array",
    "Koko Eating Bananas: Binary search on answer",
  ],
  interviewTips: [
    "Always confirm the array is sorted first",
    "Be explicit about your loop invariant",
    "Handle edge cases: empty array, single element",
  ],
}
