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
  problemStatement: `Given an array nums of n integers, return an array of all the unique quadruplets [nums[a], nums[b], nums[c], nums[d]] such that:

- 0 <= a, b, c, d < n
- a, b, c, d are distinct
- nums[a] + nums[b] + nums[c] + nums[d] == target

You may return the answer in any order.`,
  examples: [
    {
      input: "nums = [1,0,-1,0,-2,2], target = 0",
      output: "[[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]",
    },
    { input: "nums = [2,2,2,2,2], target = 8", output: "[[2,2,2,2]]" },
  ],
  constraints: ["1 <= nums.length <= 200", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
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
