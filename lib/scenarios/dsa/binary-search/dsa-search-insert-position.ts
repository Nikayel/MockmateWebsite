import type { DSAScenario } from "../../types"

export const dsaSearchInsertPositionScenario: DSAScenario = {
  id: "dsa-search-insert-position",
  title: "Search Insert Position",
  type: "dsa",
  pattern: "binary-search",
  difficulty: "easy",
  companies: ["Google", "Amazon", "Microsoft", "Apple"],
  description: "Find the index where a target should be inserted in a sorted array",
  tags: ["array", "binary-search"],
  estimatedTime: 15,
  problemStatement: `Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order.

You must write an algorithm with O(log n) runtime complexity.`,
  examples: [
    { input: "nums = [1,3,5,6], target = 5", output: "2" },
    { input: "nums = [1,3,5,6], target = 2", output: "1" },
    { input: "nums = [1,3,5,6], target = 7", output: "4" },
  ],
  constraints: [
    "1 <= nums.length <= 10^4",
    "-10^4 <= nums[i] <= 10^4",
    "nums contains distinct values sorted in ascending order.",
    "-10^4 <= target <= 10^4",
  ],
  hints: [
    "Binary search for leftmost position where element >= target",
    "If found, return index; if not, return where it should be",
    "Final left pointer will be the insertion position",
  ],
  starterCode: {
    javascript: `function searchInsert(nums, target) {
  // Write your solution here

}`,
    typescript: `function searchInsert(nums: number[], target: number): number {
  // Write your solution here

}`,
    python: `def searchInsert(nums, target):
    # Write your solution here
    pass`,
  },
  optimalComplexity: { time: "O(log n)", space: "O(1)" },
  testCases: [
    { input: { nums: [1, 3, 5, 6], target: 5 }, expected: 2, description: "Target found" },
    {
      input: { nums: [1, 3, 5, 6], target: 2 },
      expected: 1,
      description: "Insert between elements",
    },
    { input: { nums: [1, 3, 5, 6], target: 7 }, expected: 4, description: "Insert at end" },
    { input: { nums: [1, 3, 5, 6], target: 0 }, expected: 0, description: "Insert at beginning" },
    {
      input: { nums: [1], target: 0 },
      expected: 0,
      description: "Single element, insert before",
    },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "What does the left pointer represent when the loop ends?",
    "How is this different from standard binary search?",
    "What if target is larger than all elements?",
    "What if target is smaller than all elements?",
  ],

  midCodingProbes: [
    {
      trigger: "when target equals mid",
      question: "If you find the target, can you return immediately?",
    },
    {
      trigger: "return value",
      question: "Why return left instead of right at the end?",
    },
  ],
}
