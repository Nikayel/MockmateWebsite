import type { DSAScenario } from "../../types"

export const dsaNextGreaterElementIScenario: DSAScenario = {
  id: "dsa-next-greater-element-i",
  title: "Next Greater Element I",
  type: "dsa",
  pattern: "stack",
  difficulty: "easy",
  companies: ["Amazon", "Google", "Bloomberg"],
  description: "Answer next-greater queries for values drawn from a second array",
  tags: ["stack", "hash-table", "monotonic-stack"],
  estimatedTime: 15,
  problemStatement: `You're given two 0-indexed integer arrays nums1 and nums2. Neither contains a repeated value, and each entry of nums1 also appears somewhere in nums2.

A value's next greater element is the first entry strictly larger than it as you scan rightward from its spot in the array; running off the end without a hit means it has none. For every nums1[i], locate that same value inside nums2 and take the next greater element it has there, writing -1 when it has none.

Hand back an array ans the same length as nums1, where ans[i] stores the result for nums1[i].`,
  examples: [
    {
      input: "nums1 = [6,2,5], nums2 = [2,7,6,5]",
      output: "[-1,7,-1]",
      explanation:
        "6 has nothing larger after it in nums2. 2 is followed immediately by 7. 5 sits last, so nothing follows it.",
    },
    { input: "nums1 = [3,8], nums2 = [2,3,5,8]", output: "[5,-1]" },
  ],
  constraints: [
    "nums1 has at least 1 element and never more than nums2, which tops out at 1000 elements",
    "values in nums1 and nums2 all sit between 0 and 10^4",
    "no value repeats inside nums1 or inside nums2",
  ],
  hints: [
    "Use monotonic decreasing stack on nums2",
    "Build a map from element to its next greater",
    "Look up each element of nums1 in the map",
  ],
  starterCode: {
    javascript: `function nextGreaterElement(nums1, nums2) {\n  // Write your solution here\n}`,
    typescript: `function nextGreaterElement(nums1: number[], nums2: number[]): number[] {\n  // Write your solution here\n}`,
    python: `def nextGreaterElement(nums1: list[int], nums2: list[int]) -> list[int]:\n    # Write your solution here\n    pass`,
    java: `class Solution {\n    public int[] nextGreaterElement(int[] nums1, int[] nums2) {\n        // Write your solution here\n        return new int[0];\n    }\n}`,
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
    // Wherever a next greater element existed it sat immediately after the value, so only
    // looking at the following position passed. Here 3 has to skip past the smaller 2.
    {
      input: { nums1: [3], nums2: [1, 3, 2, 4] },
      expected: [4],
      description: "Next greater element is not the adjacent one",
    },
  ],
}
