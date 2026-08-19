import type { DSAScenario } from "../../types"

export const dsaNextPermutationScenario: DSAScenario = {
  id: "dsa-next-permutation",
  title: "Next Permutation",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "medium",
  companies: ["Google", "Amazon", "Microsoft", "Meta", "Apple"],
  description: "Advance an array to the permutation that follows it in dictionary order",
  tags: ["array", "two-pointers"],
  estimatedTime: 25,
  problemStatement: `You're given an integer array nums. Treat its contents as one arrangement out of all the possible orderings of those same values, and imagine every ordering listed in lexicographic (dictionary) order.

Rearrange nums into the ordering that comes immediately after its current one in that list. If nums is already the last ordering, cycle back to the first one, which is the values in ascending order. For instance, [2,4,6] becomes [2,6,4], while [9,7,4] has nothing after it and wraps around to [4,7,9].

Carry out the rearrangement in place, using only constant extra memory.`,
  examples: [
    { input: "nums = [2,4,6]", output: "[2,6,4]" },
    { input: "nums = [9,7,4]", output: "[4,7,9]" },
    { input: "nums = [2,2,8]", output: "[2,8,2]" },
  ],
  constraints: ["nums holds between 1 and 100 values.", "Each value sits between 0 and 100."],
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
