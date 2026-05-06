import type { DSAScenario } from "../../types"

export const dsaBinarySearchScenario: DSAScenario = {
  id: "dsa-binary-search",
  title: "Binary Search",
  type: "dsa",
  pattern: "binary-search",
  difficulty: "easy",
  companies: ["Google", "Amazon", "Meta", "Microsoft", "NVIDIA", "TikTok", "ZipRecruiter"],
  description: "Implement binary search on a sorted array",
  tags: ["array", "binary-search"],
  estimatedTime: 15,
  problemStatement: `Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.

You must write an algorithm with O(log n) runtime complexity.`,
  examples: [
    {
      input: "nums = [-1,0,3,5,9,12], target = 9",
      output: "4",
      explanation: "9 exists in nums and its index is 4",
    },
    {
      input: "nums = [-1,0,3,5,9,12], target = 2",
      output: "-1",
      explanation: "2 does not exist in nums so return -1",
    },
  ],
  constraints: [
    "1 <= nums.length <= 10^4",
    "-10^4 < nums[i], target < 10^4",
    "All the integers in nums are unique",
    "nums is sorted in ascending order",
  ],
  hints: [
    "Use two pointers: left and right",
    "Calculate mid and compare with target",
    "Adjust left or right based on comparison",
  ],
  starterCode: {
    javascript: `function search(nums, target) {
  // Write your solution here

}`,
    typescript: `function search(nums: number[], target: number): number {
  // Write your solution here

}`,
    python: `def search(nums, target):
    # Write your solution here
    pass`,
  },
  optimalComplexity: {
    time: "O(log n)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { nums: [-1, 0, 3, 5, 9, 12], target: 9 },
      expected: 4,
      description: "Target found at index 4",
    },
    {
      input: { nums: [-1, 0, 3, 5, 9, 12], target: 2 },
      expected: -1,
      description: "Target not found",
    },
    {
      input: { nums: [5], target: 5 },
      expected: 0,
      description: "Single element, found",
    },
    {
      input: { nums: [5], target: -5 },
      expected: -1,
      description: "Single element, not found",
    },
    {
      input: { nums: [1, 3, 5, 7, 9, 11, 13, 15], target: 1 },
      expected: 0,
      description: "Target at beginning",
    },
    {
      input: { nums: [1, 3, 5, 7, 9, 11, 13, 15], target: 15 },
      expected: 7,
      description: "Target at end",
    },
    // Edge cases
    {
      input: { nums: [-10, -5, 0, 5, 10], target: -10 },
      expected: 0,
      description: "Edge: Negative numbers, target at start",
    },
    {
      input: { nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], target: 10 },
      expected: 9,
      description: "Edge: Large array, target at end",
    },
    {
      input: { nums: [1, 2], target: 1 },
      expected: 0,
      description: "Edge: Two elements, target is first",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What if the target is at the very beginning or end?",
    "How do you avoid integer overflow when calculating mid?",
    "What's the difference between using < vs <= in the while condition?",
    "When would binary search fail (i.e., what's the precondition)?",
  ],

  midCodingProbes: [
    {
      trigger: "calculating mid",
      question: "Why use left + (right - left) / 2 instead of (left + right) / 2?",
    },
    {
      trigger: "updating pointers",
      question: "When you update left or right, why do you use mid + 1 or mid - 1?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Off-by-one errors in pointer updates",
      codeSignals: ["left = mid", "right = mid", "infinite loop"],
      intervention:
        "If you set left = mid instead of mid + 1, you might create an infinite loop when left == mid. Think about what happens.",
    },
  ],
}
