import type { DSAScenario } from "../../types"

export const dsaSquaresSortedArrayScenario: DSAScenario = {
  id: "dsa-squares-sorted-array",
  title: "Squares of a Sorted Array",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "easy",
  companies: ["Amazon", "Meta", "Google", "Microsoft"],
  description: "Square every entry of a sorted array and keep the results in order",
  tags: ["array", "two-pointers", "sorting"],
  estimatedTime: 15,
  problemStatement: `You're given an integer array nums whose values already appear in non-decreasing order. Square each value, then hand back a new array holding all of those squares arranged in non-decreasing order as well.`,
  examples: [
    {
      input: "nums = [-6,-2,0,1,5]",
      output: "[0,1,4,25,36]",
      explanation: "After squaring: [36,4,0,1,25]. After sorting: [0,1,4,25,36].",
    },
    { input: "nums = [-8,-5,1,5,9]", output: "[1,25,25,64,81]" },
  ],
  constraints: [
    "nums holds between 1 and 10^4 values",
    "each nums[i] lies between -10^4 and 10^4",
    "the entries of nums arrive in non-decreasing order",
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
