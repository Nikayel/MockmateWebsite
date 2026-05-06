import type { DSAScenario } from "../../types"

export const dsaNextGreaterElementIScenario: DSAScenario = {
  id: "dsa-next-greater-element-i",
  title: "Next Greater Element I",
  type: "dsa",
  pattern: "stack",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Bloomberg"],
  description: "Find the next greater element for each element from a subset",
  tags: ["stack", "hash-table", "monotonic-stack"],
  estimatedTime: 15,
  problemStatement: `The next greater element of some element x in an array is the first greater element that is to the right of x in the same array.

You are given two distinct 0-indexed integer arrays nums1 and nums2, where nums1 is a subset of nums2.

For each 0 <= i < nums1.length, find the index j such that nums1[i] == nums2[j] and determine the next greater element of nums2[j] in nums2. If there is no next greater element, then the answer for this query is -1.

Return an array ans of length nums1.length such that ans[i] is the next greater element as described above.`,
  examples: [
    {
      input: "nums1 = [4,1,2], nums2 = [1,3,4,2]",
      output: "[-1,3,-1]",
      explanation: "For 4: no greater to right. For 1: 3 is next greater. For 2: no greater.",
    },
    { input: "nums1 = [2,4], nums2 = [1,2,3,4]", output: "[3,-1]" },
  ],
  constraints: [
    "1 <= nums1.length <= nums2.length <= 1000",
    "0 <= nums1[i], nums2[i] <= 10^4",
    "All integers in nums1 and nums2 are unique.",
  ],
  hints: [
    "Use monotonic decreasing stack on nums2",
    "Build a map from element to its next greater",
    "Look up each element of nums1 in the map",
  ],
  starterCode: {
    javascript: `function nextGreaterElement(nums1, nums2) {\n  // Use monotonic stack + hashmap\n}`,
    typescript: `function nextGreaterElement(nums1: number[], nums2: number[]): number[] {\n  // Use monotonic stack + hashmap\n}`,
    python: `def nextGreaterElement(nums1: list[int], nums2: list[int]) -> list[int]:\n    # Use monotonic stack + hashmap\n    pass`,
    java: `class Solution {\n    public int[] nextGreaterElement(int[] nums1, int[] nums2) {\n        // Use monotonic stack + hashmap\n        return new int[0];\n    }\n}`,
  },
  optimalComplexity: { time: "O(n + m)", space: "O(n)" },
  testCases: [
    {
      input: { nums1: [4, 1, 2], nums2: [1, 3, 4, 2] },
      expected: [-1, 3, -1],
      description: "Mixed results",
    },
    {
      input: { nums1: [2, 4], nums2: [1, 2, 3, 4] },
      expected: [3, -1],
      description: "Ascending array",
    },
  ],
}
