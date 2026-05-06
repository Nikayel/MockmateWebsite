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
  problemStatement: `Given an integer array nums, rotate the array to the right by k steps, where k is non-negative.

Follow up:
- Try to come up with as many solutions as you can. There are at least three different ways to solve this problem.
- Could you do it in-place with O(1) extra space?`,
  examples: [
    {
      input: "nums = [1,2,3,4,5,6,7], k = 3",
      output: "[5,6,7,1,2,3,4]",
      explanation:
        "rotate 1 step: [7,1,2,3,4,5,6], rotate 2 steps: [6,7,1,2,3,4,5], rotate 3 steps: [5,6,7,1,2,3,4]",
    },
    {
      input: "nums = [-1,-100,3,99], k = 2",
      output: "[3,99,-1,-100]",
    },
  ],
  constraints: ["1 <= nums.length <= 10^5", "-2^31 <= nums[i] <= 2^31 - 1", "0 <= k <= 10^5"],
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
