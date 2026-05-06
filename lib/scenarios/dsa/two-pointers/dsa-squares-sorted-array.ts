import type { DSAScenario } from "../../types"

export const dsaSquaresSortedArrayScenario: DSAScenario = {
  id: "dsa-squares-sorted-array",
  title: "Squares of a Sorted Array",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "easy",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Return squares of sorted array in sorted order",
  tags: ["array", "two-pointers", "sorting"],
  estimatedTime: 15,
  problemStatement: `Given an integer array nums sorted in non-decreasing order, return an array of the squares of each number sorted in non-decreasing order.`,
  examples: [
    {
      input: "nums = [-4,-1,0,3,10]",
      output: "[0,1,9,16,100]",
      explanation: "After squaring: [16,1,0,9,100]. After sorting: [0,1,9,16,100].",
    },
    { input: "nums = [-7,-3,2,3,11]", output: "[4,9,9,49,121]" },
  ],
  constraints: [
    "1 <= nums.length <= 10^4",
    "-10^4 <= nums[i] <= 10^4",
    "nums is sorted in non-decreasing order",
  ],
  hints: [
    "Negative numbers become positive when squared",
    "Use two pointers at both ends",
    "Compare absolute values and fill result from the end",
  ],
  starterCode: {
    javascript: `function sortedSquares(nums) {\n  // Write your solution here\n\n}`,
    typescript: `function sortedSquares(nums: number[]): number[] {\n  // Write your solution here\n\n}`,
    python: `def sortedSquares(nums):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(n)" },
  testCases: [
    {
      input: { nums: [-4, -1, 0, 3, 10] },
      expected: [0, 1, 9, 16, 100],
      description: "Mixed positive and negative",
    },
    {
      input: { nums: [-7, -3, 2, 3, 11] },
      expected: [4, 9, 9, 49, 121],
      description: "More negatives",
    },
    {
      input: { nums: [1, 2, 3, 4, 5] },
      expected: [1, 4, 9, 16, 25],
      description: "All positive",
    },
  ],
}
