import type { DSAScenario } from "../../types"

export const dsaProductArrayExceptSelfScenario: DSAScenario = {
  id: "dsa-product-array-except-self",
  title: "Product of Array Except Self",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "medium",
  companies: ["Meta", "Amazon", "Apple", "Microsoft", "TikTok", "NVIDIA"],
  description: "Calculate product of all elements except current element",
  tags: ["array", "prefix-sum"],
  estimatedTime: 25,
  problemStatement: `You're given an integer array nums. Build a new array answer where each slot answer[i] holds the product of every entry in nums other than nums[i] itself, and return it.

Division is off the table, and your solution has to run in O(n) time. Whatever prefix or suffix of nums you multiply together, the result is promised to fit in a 32-bit integer.`,
  examples: [
    {
      input: "nums = [2,5,3,10]",
      output: "[150,60,100,30]",
    },
    {
      input: "nums = [4,-2,0,5,-6]",
      output: "[0,0,240,0,0]",
    },
  ],
  constraints: [
    "nums holds between 2 and 10^5 entries.",
    "Each entry sits in the range -30 to 30.",
    "Multiplying out any prefix or any suffix of nums stays within a 32-bit integer.",
  ],
  hints: [
    "Use two passes: one for prefix products, one for suffix products",
    "You can optimize space by storing prefix products in the result array",
    "Then multiply by suffix products in a second pass",
  ],
  starterCode: {
    javascript: `function productExceptSelf(nums) {
  // Write your solution here

}`,
    typescript: `function productExceptSelf(nums: number[]): number[] {
  // Write your solution here

}`,
    python: `def productExceptSelf(nums):
    # Write your solution here
    pass`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(1)",
  },
  testCases: [
    {
      input: { nums: [1, 2, 3, 4] },
      expected: [24, 12, 8, 6],
      description: "Basic case: [1,2,3,4]",
    },
    {
      input: { nums: [-1, 1, 0, -3, 3] },
      expected: [0, 0, 9, 0, 0],
      description: "With zeros and negatives",
    },
    {
      input: { nums: [2, 3] },
      expected: [3, 2],
      description: "Two elements: [2,3]",
    },
    {
      input: { nums: [1, 2, 3] },
      expected: [6, 3, 2],
      description: "Three elements: [1,2,3]",
    },
    {
      input: { nums: [-1, -2, -3, -4] },
      expected: [-24, -12, -8, -6],
      description: "All negative numbers",
    },
    // Edge cases
    {
      input: { nums: [0, 0] },
      expected: [0, 0],
      description: "Edge: Multiple zeros",
    },
    {
      input: { nums: [5, 5, 5, 5] },
      expected: [125, 125, 125, 125],
      description: "Edge: All same values",
    },
  ],
}
