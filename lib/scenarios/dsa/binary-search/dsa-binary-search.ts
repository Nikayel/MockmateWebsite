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
  problemStatement: `You're given a sorted integer array nums, arranged in increasing order, plus an integer target. Track down where target sits in nums and return that index. When target isn't present at all, return -1.

Your solution has to run in O(log n) time.`,
  examples: [
    {
      input: "nums = [-8,-3,0,4,7,10,14], target = 7",
      output: "4",
      explanation: "7 is in nums, sitting at index 4",
    },
    {
      input: "nums = [-8,-3,0,4,7,10,14], target = 5",
      output: "-1",
      explanation: "5 never appears in nums, so the answer is -1",
    },
  ],
  constraints: [
    "nums holds between 1 and 10^4 entries",
    "Every value in nums, and target itself, sits strictly between -10^4 and 10^4",
    "No value appears in nums more than once",
    "nums comes to you already sorted, smallest to largest",
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
