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
  problemStatement: `You're handed a circular integer array nums: stepping past its last element wraps you back around to nums[0]. Produce the next greater number for every element.

For a value x, its next greater number is the first element strictly bigger than x encountered while walking forward from x's position, wrapping around the end when necessary. If a full lap turns up nothing bigger, record -1 for that position.`,
  examples: [
    {
      input: "nums = [3,5,3]",
      output: "[5,-1,5]",
      explanation:
        "Each 3 finds 5 as the first bigger value; the second 3 wraps past the end to reach it. 5 has no bigger value anywhere in the loop.",
    },
    { input: "nums = [2,4,6,8,6]", output: "[4,6,8,-1,8]" },
  ],
  constraints: [
    "nums holds between 1 and 10^4 elements",
    "each nums[i] lies in the range -10^9 to 10^9",
  ],
  hints: [
    "Iterate through array twice (or use modulo) to handle circularity",
    "Use monotonic decreasing stack storing indices",
    "On second pass, only pop from stack (don't push)",
  ],
  starterCode: {
    javascript: `function nextGreaterElements(nums) {\n  // Write your solution here\n}`,
    typescript: `function nextGreaterElements(nums: number[]): number[] {\n  // Write your solution here\n}`,
    python: `def nextGreaterElements(nums: list[int]) -> list[int]:\n    # Write your solution here\n    pass`,
    java: `class Solution {\n    public int[] nextGreaterElements(int[] nums) {\n        // Write your solution here\n        return new int[0];\n    }\n}`,
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
