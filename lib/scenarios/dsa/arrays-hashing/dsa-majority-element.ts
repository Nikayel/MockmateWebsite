import type { DSAScenario } from "../../types"

export const dsaMajorityElementScenario: DSAScenario = {
  id: "dsa-majority-element",
  title: "Majority Element",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
  description: "Find the element that appears more than n/2 times using Boyer-Moore algorithm",
  tags: ["array", "hash-table", "divide-and-conquer", "sorting", "counting"],
  estimatedTime: 15,
  problemStatement: `Given an array nums of size n, return the majority element.

The majority element is the element that appears more than ⌊n / 2⌋ times. You may assume that the majority element always exists in the array.

Follow-up: Could you solve the problem in linear time and in O(1) space?`,
  examples: [
    { input: "nums = [3,2,3]", output: "3" },
    { input: "nums = [2,2,1,1,1,2,2]", output: "2" },
  ],
  constraints: ["n == nums.length", "1 <= n <= 5 * 10^4", "-10^9 <= nums[i] <= 10^9"],
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
