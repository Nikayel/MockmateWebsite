import type { DSAScenario } from "../../types"

export const dsaFindFirstLastPositionScenario: DSAScenario = {
  id: "dsa-find-first-last-position",
  title: "Find First and Last Position of Element in Sorted Array",
  type: "dsa",
  pattern: "binary-search",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "NVIDIA"],
  description: "Locate the first and last index of a target value in a sorted array",
  tags: ["array", "binary-search"],
  estimatedTime: 25,
  problemStatement: `You're handed an integer array nums sorted in non-decreasing order, along with a target value. Work out the index range that target occupies: the position where it first shows up and the position where it last does, returned as a pair. If nums doesn't contain target anywhere, return [-1, -1].

Your solution needs to run in O(log n) time.`,
  examples: [
    { input: "nums = [2,4,4,4,9,11], target = 4", output: "[1,3]" },
    { input: "nums = [2,4,4,4,9,11], target = 7", output: "[-1,-1]" },
    { input: "nums = [], target = 3", output: "[-1,-1]" },
  ],
  constraints: [
    "nums holds anywhere from 0 to 10^5 values",
    "Each entry of nums fits between -10^9 and 10^9",
    "Values in nums never decrease from left to right",
    "target also fits between -10^9 and 10^9",
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
