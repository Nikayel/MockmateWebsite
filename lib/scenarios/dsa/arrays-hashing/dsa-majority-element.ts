import type { DSAScenario } from "../../types"

export const dsaMajorityElementScenario: DSAScenario = {
  id: "dsa-majority-element",
  title: "Majority Element",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
  description: "Find the value that fills more than half of an array's slots",
  tags: ["array", "hash-table", "divide-and-conquer", "sorting", "counting"],
  estimatedTime: 15,
  problemStatement: `You're given an array nums containing n integers. One value forms a majority: it fills more than ⌊n / 2⌋ of the n positions, and every input handed to you is promised to have such a value.

Return the majority value.

Follow-up: can you manage linear time and O(1) space?`,
  examples: [
    { input: "nums = [8,5,8]", output: "8" },
    { input: "nums = [4,4,6,6,4,6,4,4]", output: "4" },
  ],
  constraints: [
    "n equals the size of nums",
    "n sits between 1 and 5 * 10^4",
    "Entries fall anywhere from -10^9 to 10^9",
  ],
  hints: [
    "Hash map solution: count frequencies, return element with count > n/2",
    "Sorting solution: majority element will always be at n/2 index",
    "Boyer-Moore Voting Algorithm: O(n) time, O(1) space",
    "Boyer-Moore: maintain candidate and count, increment/decrement based on match",
  ],
  starterCode: {
    javascript: `function majorityElement(nums) {
  // Write your solution here

}`,
    typescript: `function majorityElement(nums: number[]): number {
  // Write your solution here

}`,
    python: `def majorityElement(nums):
    # Write your solution here
    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    { input: { nums: [3, 2, 3] }, expected: 3, description: "Simple majority" },
    { input: { nums: [2, 2, 1, 1, 1, 2, 2] }, expected: 2, description: "Longer array" },
    { input: { nums: [1] }, expected: 1, description: "Single element" },
    { input: { nums: [1, 1, 1, 1] }, expected: 1, description: "All same" },
    { input: { nums: [6, 5, 5] }, expected: 5, description: "Majority at end" },
  ],
}
