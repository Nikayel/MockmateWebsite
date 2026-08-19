import type { DSAScenario } from "../../types"

export const dsa4sumScenario: DSAScenario = {
  id: "dsa-4sum",
  title: "4Sum",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "medium",
  companies: ["Amazon", "Meta", "Google", "Apple"],
  description: "Find all unique quadruplets that sum to target",
  tags: ["array", "two-pointers", "sorting"],
  estimatedTime: 35,
  problemStatement: `You're given an integer array nums holding n values, plus an integer target. Gather every unique quadruplet [nums[a], nums[b], nums[c], nums[d]] built from four pairwise-distinct indices a, b, c, d drawn from 0 to n - 1, whose four values sum to target.

List the quadruplets however you like, but no combination of values may appear more than once.`,
  examples: [
    {
      input: "nums = [1,3,0,-2,2,-1], target = 2",
      output: "[[-2,-1,2,3],[-2,0,1,3],[-1,0,1,2]]",
    },
    { input: "nums = [3,3,3,3,3], target = 12", output: "[[3,3,3,3]]" },
  ],
  constraints: [
    "nums holds between 1 and 200 integers",
    "each nums[i] lies between -10^9 and 10^9",
    "target lies between -10^9 and 10^9",
  ],
  hints: [
    "Sort the array first",
    "Use two nested loops for first two numbers",
    "Use two-pointer technique for remaining two numbers",
    "Skip duplicates at each level to avoid duplicate quadruplets",
  ],
  starterCode: {
    javascript: `function fourSum(nums, target) {\n  // Write your solution here\n\n}`,
    typescript: `function fourSum(nums: number[], target: number): number[][] {\n  // Write your solution here\n\n}`,
    python: `def fourSum(nums, target):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n³)", space: "O(1)" },
  testCases: [
    {
      input: { nums: [1, 0, -1, 0, -2, 2], target: 0 },
      expected: [
        [-2, -1, 1, 2],
        [-2, 0, 0, 2],
        [-1, 0, 0, 1],
      ],
      description: "Multiple quadruplets",
      compareAsSet: true,
    },
    {
      input: { nums: [2, 2, 2, 2, 2], target: 8 },
      expected: [[2, 2, 2, 2]],
      description: "All same elements",
    },
  ],
}
