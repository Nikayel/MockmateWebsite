import type { DSAScenario } from "../../types"

export const maximumProductSubarrayScenario: DSAScenario = {
  id: "dsa-maximum-product-subarray",
  title: "Maximum Product Subarray",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "LinkedIn"],
  description: "Hunt down the run of adjacent entries whose product comes out largest",
  tags: ["dynamic-programming", "array"],
  estimatedTime: 25,
  problemStatement: `You're given an integer array nums. Pick a contiguous run of entries, at least one entry long, whose product comes out as large as possible, and return that product.

The run must be unbroken: you can't skip an entry to dodge a zero or a negative value. Every test is built so the answer fits in a 32-bit integer.`,
  examples: [
    {
      input: "nums = [3,-1,4,2]",
      output: "8",
      explanation: "[4,2] multiplies to 8, the best any unbroken run manages here.",
    },
    {
      input: "nums = [-3,0,-5]",
      output: "0",
      explanation:
        "-3 and -5 would multiply to 15, but they sit on opposite sides of the 0 and a run cannot jump over it.",
    },
  ],
  constraints: [
    "nums holds between 1 and 2 * 10^4 entries.",
    "Each entry sits between -10 and 10.",
    "Multiplying any prefix or any suffix of nums stays inside a 32-bit integer.",
  ],
  hints: [
    "Track both max and min product ending at each position",
    "Negative * negative can become positive max",
    "When current num is negative, swap max and min",
    "Reset when seeing 0",
  ],
  starterCode: {
    javascript: `function maxProduct(nums) {
// Write your solution here

}`,
    typescript: `function maxProduct(nums: number[]): number {
// Write your solution here

}`,
    python: `def maxProduct(nums):
  # Write your solution here
  pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    { input: { nums: [2, 3, -2, 4] }, expected: 6, description: "[2,3] = 6" },
    { input: { nums: [-2, 0, -1] }, expected: 0, description: "Zero breaks subarray" },
    { input: { nums: [-2, 3, -4] }, expected: 24, description: "Negative * negative" },
    { input: { nums: [2] }, expected: 2, description: "Single element" },
    { input: { nums: [-2] }, expected: -2, description: "Single negative" },
    { input: { nums: [0, 2] }, expected: 2, description: "Zero at start" },
  ],
}
