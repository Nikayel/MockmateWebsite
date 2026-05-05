import type { DSAPatternKnowledge } from "../../types"

export const arraysHashingKnowledge: DSAPatternKnowledge = {
  pattern: "arrays-hashing",
  displayName: "Arrays & Hashing",
  description:
    "Fundamental pattern using arrays and hash maps for O(1) lookups. Hash maps provide constant-time access to elements, making them ideal for counting, grouping, and finding duplicates.",
  whenToUse: [
    "Need O(1) lookup or insertion",
    "Counting occurrences of elements",
    "Finding duplicates or unique elements",
    "Grouping elements by some property",
    "Two Sum-style problems requiring complement lookup",
  ],
  keyInsights: [
    "Trade space for time - hash maps use extra memory but provide O(1) operations",
    "Consider edge cases: empty arrays, single elements, negative numbers",
    "Hash collisions can affect performance in edge cases",
    "Arrays are stored contiguously in memory, good for cache performance",
  ],
  commonMistakes: [
    "Forgetting to handle empty arrays",
    "Not considering duplicate elements",
    "Using wrong data types for hash keys",
    "Modifying array while iterating",
  ],
  timeComplexity: {
    typical: "O(n)",
    best: "O(1) for direct access",
    worst: "O(n) for searching unsorted",
  },
  spaceComplexity: {
    typical: "O(n)",
    notes: "Hash maps require additional space proportional to unique elements",
  },
  relatedPatterns: ["two-pointers", "sliding-window"],
  prerequisites: [],
  codeTemplate: `def solve(nums):
  seen = {}  # or set() for existence checks
  for i, num in enumerate(nums):
      complement = target - num
      if complement in seen:
          return [seen[complement], i]
      seen[num] = i
  return []`,
  examples: [
    "Two Sum: Find two numbers that add up to target",
    "Contains Duplicate: Check if array has duplicates",
    "Group Anagrams: Group strings by their sorted characters",
  ],
  interviewTips: [
    "Always clarify if the array is sorted",
    "Ask about duplicates and how to handle them",
    "Consider both time and space trade-offs out loud",
  ],
}
