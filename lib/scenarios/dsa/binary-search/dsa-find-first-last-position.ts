import type { DSAScenario } from "../../types"

export const dsaFindFirstLastPositionScenario: DSAScenario = {
  id: "dsa-find-first-last-position",
  title: "Find First and Last Position of Element in Sorted Array",
  type: "dsa",
  pattern: "binary-search",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "NVIDIA"],
  description: "Find the starting and ending position of a target value in a sorted array",
  tags: ["array", "binary-search"],
  estimatedTime: 25,
  problemStatement: `Given an array of integers nums sorted in non-decreasing order, find the starting and ending position of a given target value. If target is not found in the array, return [-1, -1]. You must write an algorithm with O(log n) runtime complexity.`,
  examples: [
    { input: "nums = [5,7,7,8,8,10], target = 8", output: "[3,4]" },
    { input: "nums = [5,7,7,8,8,10], target = 6", output: "[-1,-1]" },
    { input: "nums = [], target = 0", output: "[-1,-1]" },
  ],
  constraints: [
    "0 <= nums.length <= 10^5",
    "-10^9 <= nums[i] <= 10^9",
    "nums is a non-decreasing array",
    "-10^9 <= target <= 10^9",
  ],
  hints: [
    "Use two separate binary searches",
    "First search for leftmost occurrence",
    "Then search for rightmost occurrence",
  ],
  starterCode: {
    javascript: `function searchRange(nums, target) {\n  // Write your solution here\n\n}`,
    typescript: `function searchRange(nums: number[], target: number): number[] {\n  // Write your solution here\n\n}`,
    python: `def searchRange(nums, target):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(log n)", space: "O(1)" },
  testCases: [
    {
      input: { nums: [5, 7, 7, 8, 8, 10], target: 8 },
      expected: [3, 4],
      description: "Target found multiple times",
    },
    {
      input: { nums: [5, 7, 7, 8, 8, 10], target: 6 },
      expected: [-1, -1],
      description: "Target not found",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "Why can't you find both positions with a single binary search?",
    "How do you modify binary search to find the leftmost occurrence?",
    "What if all elements in the array are the same as target?",
    "What if target appears only once?",
  ],

  midCodingProbes: [
    {
      trigger: "finding left boundary",
      question: "When you find target, why do you continue searching left?",
    },
    {
      trigger: "finding right boundary",
      question: "For the right boundary, when do you stop? At target or after?",
    },
  ],
}
