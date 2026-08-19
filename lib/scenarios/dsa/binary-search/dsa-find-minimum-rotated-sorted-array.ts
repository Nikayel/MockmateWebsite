import type { DSAScenario } from "../../types"

export const dsaFindMinimumRotatedSortedArrayScenario: DSAScenario = {
  id: "dsa-find-minimum-rotated-sorted-array",
  title: "Find Minimum in Rotated Sorted Array",
  type: "dsa",
  pattern: "binary-search",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "NVIDIA"],
  description: "Find the minimum element in a rotated sorted array",
  tags: ["array", "binary-search"],
  estimatedTime: 20,
  problemStatement: `The array nums began as an ascending sorted array of unique values, but somewhere along the way it was rotated between 1 and n times, where n is its length. Each rotation takes the last element and moves it to the front: rotating [2,5,8] once gives [8,2,5], and rotating it three times lands back on [2,5,8].

Return the smallest element in nums. Your solution has to finish in O(log n) time.`,
  examples: [
    {
      input: "nums = [6,8,10,1,3]",
      output: "1",
      explanation: "This is [1,3,6,8,10] after three rotations; its smallest value is 1.",
    },
    { input: "nums = [7,9,12,15,2,4,5]", output: "2" },
    {
      input: "nums = [21,25,32,40]",
      output: "21",
      explanation: "Rotated exactly n times, so the order looks untouched.",
    },
  ],
  constraints: [
    "n stands for nums.length",
    "n falls between 1 and 5000",
    "Every value sits in the range -5000 to 5000",
    "No two values in nums match",
  ],
  hints: [
    "Use binary search to find the pivot point",
    "Compare mid element with rightmost element",
    "If mid > right, minimum is in right half",
  ],
  starterCode: {
    javascript: `function findMin(nums) {\n  // Write your solution here\n\n}`,
    typescript: `function findMin(nums: number[]): number {\n  // Write your solution here\n\n}`,
    python: `def findMin(nums):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(log n)", space: "O(1)" },
  testCases: [
    { input: { nums: [3, 4, 5, 1, 2] }, expected: 1, description: "Rotated array" },
    { input: { nums: [11, 13, 15, 17] }, expected: 11, description: "Not rotated" },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What if the array is not rotated at all?",
    "Why compare with the rightmost element instead of leftmost?",
    "What if there are duplicates (like in Find Minimum II)?",
    "Could you also find the rotation point using this?",
  ],

  midCodingProbes: [
    {
      trigger: "comparing mid with right",
      question: "If nums[mid] > nums[right], which half contains the minimum?",
    },
    {
      trigger: "narrowing search space",
      question: "When do you know you've found the minimum?",
    },
  ],
}
