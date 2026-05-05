import type { DSAPatternKnowledge } from "../../types"

export const twoPointersKnowledge: DSAPatternKnowledge = {
  pattern: "two-pointers",
  displayName: "Two Pointers",
  description:
    "Use two pointers to traverse array/string from different positions. Efficient for sorted arrays, palindrome checking, and partition problems. Reduces O(n²) brute force to O(n).",
  whenToUse: [
    "Array/string is sorted or you need to find pairs",
    "Palindrome checking",
    "Removing duplicates in-place",
    "Partitioning arrays (Dutch National Flag)",
    "Container problems (water, area)",
  ],
  keyInsights: [
    "Start pointers from opposite ends for sorted array problems",
    "Start from same end for fast/slow pointer problems",
    "Movement logic depends on the condition being checked",
    "Often achieves O(1) space when problem seems to need O(n)",
    "DUPLICATE SKIPPING: After incrementing left, compare nums[left] == nums[left-1] (left-1 is where we came FROM)",
    "DUPLICATE SKIPPING: After decrementing right, compare nums[right] == nums[right+1] (right+1 is where we came FROM)",
    "The +1/-1 direction in duplicate checks depends on movement direction, not pointer position",
  ],
  commonMistakes: [
    "Off-by-one errors in pointer movement",
    "Infinite loops when pointers don't move correctly",
    "Forgetting to handle equal elements",
    "Not considering when pointers cross",
    "Confusing duplicate skip direction - after DECREMENTING right, check right+1 (previous position), not right-1",
  ],
  timeComplexity: {
    typical: "O(n)",
    best: "O(1) if answer found immediately",
    worst: "O(n) - each element visited at most once per pointer",
  },
  spaceComplexity: {
    typical: "O(1)",
    notes: "Usually operates in-place, making it space-efficient",
  },
  relatedPatterns: ["sliding-window", "binary-search", "arrays-hashing"],
  prerequisites: ["arrays-hashing"],
  codeTemplate: `def two_sum_sorted(nums, target):
  left, right = 0, len(nums) - 1
  while left < right:
      current_sum = nums[left] + nums[right]
      if current_sum == target:
          return [left, right]
      elif current_sum < target:
          left += 1
      else:
          right -= 1
  return []`,
  examples: [
    "Two Sum II: Find pair in sorted array",
    "Valid Palindrome: Check if string is palindrome",
    "3Sum: Find triplets that sum to zero",
    "Container With Most Water: Maximize water area",
  ],
  interviewTips: [
    "Immediately consider if array is sorted or can be sorted",
    "Trace through your solution with a small example",
    "Explain why pointers move in each direction",
  ],
}
