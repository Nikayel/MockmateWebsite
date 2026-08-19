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
  problemStatement: `Two sorted arrays arrive together: nums1 holding m numbers and nums2 holding n. Imagine their contents pooled into one sorted list; your job is to return the median of that combined list.

The required runtime is O(log (m+n)).`,
  examples: [
    {
      input: "nums1 = [2,6], nums2 = [4]",
      output: "4.00000",
      explanation: "Pooled together the values read [2,4,6], and the middle one is 4.",
    },
    {
      input: "nums1 = [1,4], nums2 = [7,9]",
      output: "5.50000",
      explanation:
        "Combined, the values are [1,4,7,9]; the median averages the two middle entries: (4 + 7) / 2 = 5.5.",
    },
  ],
  constraints: [
    "m is the length of nums1",
    "n is the length of nums2",
    "m ranges from 0 to 1000",
    "n ranges from 0 to 1000",
    "Together the arrays hold between 1 and 2000 values",
    "Entries of nums1 and nums2 all sit between -10^6 and 10^6",
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
