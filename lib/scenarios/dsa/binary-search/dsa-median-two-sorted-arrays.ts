import type { DSAScenario } from "../../types"

export const dsaMedianTwoSortedArraysScenario: DSAScenario = {
  id: "dsa-median-two-sorted-arrays",
  title: "Median of Two Sorted Arrays",
  type: "dsa",
  pattern: "binary-search",
  difficulty: "hard",
  companies: ["Amazon", "Meta", "Google", "Microsoft", "Apple"],
  description: "Find the median of two sorted arrays in O(log(m+n)) time",
  tags: ["array", "binary-search", "divide-and-conquer"],
  estimatedTime: 40,
  problemStatement: `Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).`,
  examples: [
    {
      input: "nums1 = [1,3], nums2 = [2]",
      output: "2.00000",
      explanation: "merged array = [1,2,3] and median is 2.",
    },
    {
      input: "nums1 = [1,2], nums2 = [3,4]",
      output: "2.50000",
      explanation: "merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.",
    },
  ],
  constraints: [
    "nums1.length == m",
    "nums2.length == n",
    "0 <= m <= 1000",
    "0 <= n <= 1000",
    "1 <= m + n <= 2000",
    "-10^6 <= nums1[i], nums2[i] <= 10^6",
  ],
  hints: [
    "Binary search on the smaller array",
    "Find partition that balances left and right halves",
    "Median is max(left partition) or avg of max(left) and min(right)",
  ],
  starterCode: {
    javascript: `function findMedianSortedArrays(nums1, nums2) {\n  // Write your solution here\n\n}`,
    typescript: `function findMedianSortedArrays(nums1: number[], nums2: number[]): number {\n  // Write your solution here\n\n}`,
    python: `def findMedianSortedArrays(nums1, nums2):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(log(min(m, n)))", space: "O(1)" },
  testCases: [
    { input: { nums1: [1, 3], nums2: [2] }, expected: 2.0, description: "Odd total length" },
    { input: { nums1: [1, 2], nums2: [3, 4] }, expected: 2.5, description: "Even total length" },
  ],

  // Proactive AI Interviewer Fields
  whatIfQuestions: [
    "Why binary search on the smaller array?",
    "What does a valid partition look like?",
    "How do you handle when one array is empty?",
    "Why can't you just merge and find median? What's the constraint?",
  ],

  midCodingProbes: [
    {
      trigger: "partitioning arrays",
      question: "If you partition array A at index i, where do you partition array B?",
    },
    {
      trigger: "checking valid partition",
      question: "What condition makes a partition 'valid' for finding the median?",
    },
  ],

  commonWrongApproaches: [
    {
      description: "Merging arrays first",
      codeSignals: ["merge", "concat", "combine arrays"],
      intervention:
        "That's O(m+n) time. The problem requires O(log(min(m,n))). Can you think of a binary search approach?",
    },
  ],
}
