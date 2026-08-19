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
  problemStatement: `You're given nums, a sorted array of distinct integers, plus a target value. When target already appears in nums, return its index. When it doesn't, return the index it would need to slot into so the array stays sorted.

Your solution is expected to run in O(log n) time.`,
  examples: [
    { input: "nums = [2,4,7,9], target = 7", output: "2" },
    { input: "nums = [2,4,7,9], target = 5", output: "2" },
    { input: "nums = [2,4,7,9], target = 12", output: "4" },
  ],
  constraints: [
    "nums holds between 1 and 10^4 values",
    "Entries range from -10^4 up to 10^4",
    "No duplicates: nums is strictly increasing.",
    "target stays within -10^4 to 10^4",
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
