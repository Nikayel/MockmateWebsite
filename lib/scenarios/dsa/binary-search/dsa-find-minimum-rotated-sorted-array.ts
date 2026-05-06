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
  problemStatement: `Suppose an array of length n sorted in ascending order is rotated between 1 and n times. Given the sorted rotated array nums of unique elements, return the minimum element of this array. You must write an algorithm that runs in O(log n) time.`,
  examples: [
    {
      input: "nums = [3,4,5,1,2]",
      output: "1",
      explanation: "The original array was [1,2,3,4,5] rotated 3 times.",
    },
    { input: "nums = [4,5,6,7,0,1,2]", output: "0" },
    { input: "nums = [11,13,15,17]", output: "11", explanation: "Not rotated." },
  ],
  constraints: [
    "n == nums.length",
    "1 <= n <= 5000",
    "-5000 <= nums[i] <= 5000",
    "All the integers of nums are unique",
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
