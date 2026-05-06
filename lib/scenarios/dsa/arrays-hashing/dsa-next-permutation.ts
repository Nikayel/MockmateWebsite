import type { DSAScenario } from "../../types"

export const dsaNextPermutationScenario: DSAScenario = {
  id: "dsa-next-permutation",
  title: "Next Permutation",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "medium",
  companies: ["Google", "Amazon", "Microsoft", "Meta", "Apple"],
  description: "Find the next lexicographically greater permutation of numbers",
  tags: ["array", "two-pointers"],
  estimatedTime: 25,
  problemStatement: `A permutation of an array of integers is an arrangement of its members into a sequence or linear order.

The next permutation of an array of integers is the next lexicographically greater permutation of its integer. If such arrangement is not possible, the array must be rearranged as the lowest possible order (i.e., sorted in ascending order).

For example:
- For arr = [1,2,3], the next permutation is [1,3,2].
- For arr = [3,2,1], the next permutation is [1,2,3] (no greater permutation exists).
- For arr = [1,1,5], the next permutation is [1,5,1].

The replacement must be in place and use only constant extra memory.`,
  examples: [
    { input: "nums = [1,2,3]", output: "[1,3,2]" },
    { input: "nums = [3,2,1]", output: "[1,2,3]" },
    { input: "nums = [1,1,5]", output: "[1,5,1]" },
  ],
  constraints: ["1 <= nums.length <= 100", "0 <= nums[i] <= 100"],
  hints: [
    "Find the largest index i such that nums[i] < nums[i+1]",
    "If no such index exists, reverse the entire array",
    "Find the largest index j > i such that nums[i] < nums[j], swap them",
    "Reverse the suffix starting at i+1",
  ],
  starterCode: {
    javascript: `function nextPermutation(nums) {
  // Modify nums in-place to the next permutation

}`,
    typescript: `function nextPermutation(nums: number[]): void {
  // Modify nums in-place to the next permutation

}`,
    python: `def nextPermutation(nums):
    # Modify nums in-place to the next permutation
    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    { input: { nums: [1, 2, 3] }, expected: [1, 3, 2], description: "Standard case" },
    { input: { nums: [3, 2, 1] }, expected: [1, 2, 3], description: "Descending - wrap around" },
    { input: { nums: [1, 1, 5] }, expected: [1, 5, 1], description: "With duplicates" },
    { input: { nums: [1] }, expected: [1], description: "Single element" },
    { input: { nums: [1, 3, 2] }, expected: [2, 1, 3], description: "Mid-array swap" },
    { input: { nums: [2, 3, 1] }, expected: [3, 1, 2], description: "Complex case" },
  ],
}
