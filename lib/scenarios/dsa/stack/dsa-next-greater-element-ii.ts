import type { DSAScenario } from "../../types"

export const dsaNextGreaterElementIiScenario: DSAScenario = {
  id: "dsa-next-greater-element-ii",
  title: "Next Greater Element II",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Bloomberg"],
  description: "Find next greater element in a circular array",
  tags: ["stack", "array", "monotonic-stack"],
  estimatedTime: 20,
  problemStatement: `Given a circular integer array nums (i.e., the next element of nums[nums.length - 1] is nums[0]), return the next greater number for every element in nums.

The next greater number of a number x is the first greater number to its traversing-order next in the array, which means you could search circularly to find its next greater number. If it doesn't exist, return -1 for this number.`,
  examples: [
    {
      input: "nums = [1,2,1]",
      output: "[2,-1,2]",
      explanation:
        "First 1's next greater is 2; 2 has none; Second 1's next greater is 2 (circular).",
    },
    { input: "nums = [1,2,3,4,3]", output: "[2,3,4,-1,4]" },
  ],
  constraints: ["1 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
  hints: [
    "Iterate through array twice (or use modulo) to handle circularity",
    "Use monotonic decreasing stack storing indices",
    "On second pass, only pop from stack (don't push)",
  ],
  starterCode: {
    javascript: `function nextGreaterElements(nums) {\n  // Circular monotonic stack\n}`,
    typescript: `function nextGreaterElements(nums: number[]): number[] {\n  // Circular monotonic stack\n}`,
    python: `def nextGreaterElements(nums: list[int]) -> list[int]:\n    # Circular monotonic stack\n    pass`,
    java: `class Solution {\n    public int[] nextGreaterElements(int[] nums) {\n        // Circular monotonic stack\n        return new int[0];\n    }\n}`,
  },
  optimalComplexity: { time: "O(n)", space: "O(n)" },
  testCases: [
    { input: { nums: [1, 2, 1] }, expected: [2, -1, 2], description: "Circular wrap" },
    {
      input: { nums: [1, 2, 3, 4, 3] },
      expected: [2, 3, 4, -1, 4],
      description: "Peak in middle",
    },
  ],
}
