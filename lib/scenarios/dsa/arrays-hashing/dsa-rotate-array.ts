import type { DSAScenario } from "../../types"

export const dsaRotateArrayScenario: DSAScenario = {
  id: "dsa-rotate-array",
  title: "Rotate Array",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "medium",
  companies: ["Amazon", "Microsoft", "Meta", "Apple"],
  description: "Rotate an array to the right by k steps in-place",
  tags: ["array", "math", "two-pointers"],
  estimatedTime: 20,
  problemStatement: `You're given an integer array nums and a non-negative integer k. Shift every element k positions to the right, with values that fall off the end wrapping around to the front, and apply the change directly to nums.

Follow-up: more than one approach exists here, and at least three are worth knowing. Can you manage it in-place with O(1) extra space?`,
  examples: [
    {
      input: "nums = [10,20,30,40,50,60], k = 2",
      output: "[50,60,10,20,30,40]",
      explanation:
        "one step gives [60,10,20,30,40,50], and the second step gives [50,60,10,20,30,40]",
    },
    {
      input: "nums = [-7,-200,8,44], k = 3",
      output: "[-200,8,44,-7]",
    },
  ],
  constraints: [
    "nums holds between 1 and 10^5 elements.",
    "Each value can be as small as -2^31 or as large as 2^31 - 1.",
    "k sits between 0 and 10^5.",
  ],
  hints: [
    "Use modulo: k = k % nums.length to handle k > length",
    "Reverse approach: reverse all, reverse first k, reverse rest",
    "Cyclic replacement: place each element at its final position",
  ],
  starterCode: {
    javascript: `function rotate(nums, k) {
  // Modify nums in-place

}`,
    typescript: `function rotate(nums: number[], k: number): void {
  // Modify nums in-place

}`,
    python: `def rotate(nums, k):
    # Modify nums in-place
    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    {
      input: { nums: [1, 2, 3, 4, 5, 6, 7], k: 3 },
      expected: [5, 6, 7, 1, 2, 3, 4],
      description: "Standard rotation",
    },
    {
      input: { nums: [-1, -100, 3, 99], k: 2 },
      expected: [3, 99, -1, -100],
      description: "Negative numbers",
    },
    { input: { nums: [1, 2], k: 3 }, expected: [2, 1], description: "k > length" },
    { input: { nums: [1], k: 0 }, expected: [1], description: "No rotation" },
    { input: { nums: [1, 2, 3], k: 3 }, expected: [1, 2, 3], description: "k equals length" },
  ],
}
