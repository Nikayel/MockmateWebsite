import type { DSAScenario } from "../../types"

export const maximumProductSubarrayScenario: DSAScenario = {
  id: "dsa-maximum-product-subarray",
  title: "Maximum Product Subarray",
  type: "dsa",
  pattern: "dp-1d",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "LinkedIn"],
  description: "Find the contiguous subarray with the largest product",
  tags: ["dynamic-programming", "array"],
  estimatedTime: 25,
  problemStatement: `Given an integer array nums, find a subarray that has the largest product, and return the product.

The test cases are generated so that the answer will fit in a 32-bit integer.`,
  examples: [
    {
      input: "nums = [2,3,-2,4]",
      output: "6",
      explanation: "[2,3] has the largest product 6.",
    },
    {
      input: "nums = [-2,0,-1]",
      output: "0",
      explanation: "The result cannot be 2, because [-2,-1] is not a subarray.",
    },
  ],
  constraints: [
    "1 <= nums.length <= 2 * 10^4",
    "-10 <= nums[i] <= 10",
    "The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.",
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
